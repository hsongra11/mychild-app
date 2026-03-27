import type {
  Question,
  Child,
  AnswerEvent,
  Ruleset,
  QuestionResult,
  Severity,
  AgeResult,
} from './types.js';
import { computeAge } from './corrected-age.js';
import { resolveProbes } from './probes.js';
import { DEFAULT_RULESET } from './defaults.js';

const WEEKS_PER_MONTH = 4.34524; // 52.1775 / 12

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEffectiveAgeMonths(ageResult: AgeResult): number {
  return ageResult.useCorrectedAge
    ? ageResult.correctedMonths
    : ageResult.chronologicalMonths;
}

function isInfant(ageResult: AgeResult): boolean {
  return getEffectiveAgeMonths(ageResult) < 12;
}

/** Convert weeks to months for grace window comparisons. */
function weeksToMonths(weeks: number): number {
  return weeks / WEEKS_PER_MONTH;
}

/**
 * Calculate how many weeks after the grace deadline the child is.
 * Positive values mean they are overdue.
 */
function weeksOverGrace(
  childAgeMonths: number,
  normativeAgeMonths: number,
  graceWeeks: number,
): number {
  const graceMonths = weeksToMonths(graceWeeks);
  const deadlineMonths = normativeAgeMonths + graceMonths;
  return (childAgeMonths - deadlineMonths) * WEEKS_PER_MONTH;
}

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date.getTime());
  result.setTime(result.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  return result;
}

// ---------------------------------------------------------------------------
// Main evaluation function
// ---------------------------------------------------------------------------

/**
 * Evaluate a single question against the child's current answers and age,
 * producing a QuestionResult with severity, explanation, and next-check date.
 *
 * @param question  The milestone question to evaluate.
 * @param child     Child demographics (dob + optional gestationalWeeks).
 * @param answers   All answer events recorded so far.
 * @param ruleset   Ruleset configuration (defaults to DEFAULT_RULESET).
 * @param now       Reference date, defaults to today.
 */
export function evaluateQuestion(
  question: Question,
  child: Child,
  answers: AnswerEvent[],
  ruleset: Ruleset = DEFAULT_RULESET,
  now: Date = new Date(),
): QuestionResult {
  const ageResult = computeAge(child.dob, child.gestationalWeeks, now);
  const ageMonths = getEffectiveAgeMonths(ageResult);
  const infant = isInfant(ageResult);
  const graceWeeks = infant
    ? ruleset.graceWeeks.infant
    : ruleset.graceWeeks.toddler;

  // Find the most recent answer for this question
  const relevantAnswers = answers
    .filter((a) => a.questionId === question.id)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const latest = relevantAnswers[0];

  const suggestedProbes = resolveProbes(question.probes);

  // -------------------------------------------------------------------------
  // No answer yet → reminder
  // -------------------------------------------------------------------------
  if (!latest || latest.answer === 'skipped') {
    return {
      questionId: question.id,
      text: question.text,
      severity: 'reminder',
      explanation: 'This question has not been answered yet. Please check with your caregiver.',
      suggestedProbes,
      actionProfile: question.actionProfile,
      nextCheckDate: addWeeks(now, ruleset.deltaRepeatWeeks),
    };
  }

  // -------------------------------------------------------------------------
  // Achieved → normal
  // -------------------------------------------------------------------------
  if (latest.answer === 'achieved') {
    return {
      questionId: question.id,
      text: question.text,
      severity: 'normal',
      explanation: 'Milestone is achieved — no further monitoring needed for this item.',
      suggestedProbes: [],
      actionProfile: question.actionProfile,
    };
  }

  // -------------------------------------------------------------------------
  // Unsure → watch with low confidence, suggest probes
  // -------------------------------------------------------------------------
  if (latest.answer === 'unsure') {
    const nextCheck = addWeeks(latest.timestamp, ruleset.deltaUnsureWeeks);
    return {
      questionId: question.id,
      text: question.text,
      severity: 'watch',
      explanation:
        'The caregiver is unsure whether this milestone has been reached. ' +
        'Use the suggested probes to clarify and re-check soon.',
      suggestedProbes,
      actionProfile: question.actionProfile,
      nextCheckDate: nextCheck,
    };
  }

  // -------------------------------------------------------------------------
  // Not yet → evaluate against age and grace window
  // -------------------------------------------------------------------------
  if (latest.answer === 'not_yet') {
    // Red-flag questions (normativeAgeMonths === 0) that are answered "not_yet"
    // are treated as immediate flags regardless of age.
    if (question.tags.includes('RF') && question.normativeAgeMonths === 0) {
      return {
        questionId: question.id,
        text: question.text,
        severity: 'flag',
        explanation:
          'This is a universal red-flag question. A "not yet" response requires ' +
          'immediate follow-up with a clinician.',
        suggestedProbes,
        actionProfile: question.actionProfile,
        nextCheckDate: addWeeks(now, 1),
      };
    }

    const overGraceWeeks = weeksOverGrace(
      ageMonths,
      question.normativeAgeMonths,
      graceWeeks,
    );

    // Still within the normative window — not yet expected, just remind
    if (ageMonths < question.normativeAgeMonths) {
      const nextCheck = addWeeks(now, infant ? ruleset.deltaNotYetWeeks.infant : ruleset.deltaNotYetWeeks.toddler);
      return {
        questionId: question.id,
        text: question.text,
        severity: 'reminder',
        explanation:
          `This milestone is typically reached around ${question.normativeAgeMonths} months. ` +
          `Your child is ${ageMonths.toFixed(1)} months old — still within the expected window.`,
        suggestedProbes,
        actionProfile: question.actionProfile,
        nextCheckDate: nextCheck,
      };
    }

    // Within grace window (normative age + graceWeeks): precaution
    if (overGraceWeeks <= 0) {
      const nextCheck = addWeeks(
        now,
        infant ? ruleset.deltaNotYetWeeks.infant : ruleset.deltaNotYetWeeks.toddler,
      );
      return {
        questionId: question.id,
        text: question.text,
        severity: 'precaution',
        explanation:
          `This milestone is typically reached by ${question.normativeAgeMonths} months. ` +
          `Your child is still within the grace window — re-check in a couple of weeks.`,
        suggestedProbes,
        actionProfile: question.actionProfile,
        nextCheckDate: nextCheck,
      };
    }

    // Beyond grace by < 1 month (~4.3 weeks): warning
    const overGraceMonths = overGraceWeeks / WEEKS_PER_MONTH;
    if (overGraceMonths < 1) {
      const nextCheck = addWeeks(
        now,
        infant ? ruleset.deltaNotYetWeeks.infant : ruleset.deltaNotYetWeeks.toddler,
      );
      return {
        questionId: question.id,
        text: question.text,
        severity: 'warning',
        explanation:
          `This milestone is typically reached by ${question.normativeAgeMonths} months. ` +
          `Your child is now slightly past the expected window. ` +
          `Please monitor closely and discuss with your child's doctor if not achieved soon.`,
        suggestedProbes,
        actionProfile: question.actionProfile,
        nextCheckDate: nextCheck,
      };
    }

    // Beyond grace by >= 1 month: flag
    const nextCheck = addWeeks(now, 1);
    return {
      questionId: question.id,
      text: question.text,
      severity: 'flag',
      explanation:
        `This milestone is typically reached by ${question.normativeAgeMonths} months. ` +
        `Your child is ${overGraceMonths.toFixed(1)} months past the grace window. ` +
        `This needs prompt attention — please speak with your child's doctor.`,
      suggestedProbes,
      actionProfile: question.actionProfile,
      nextCheckDate: nextCheck,
    };
  }

  // Fallback — should never reach here with well-typed inputs
  return {
    questionId: question.id,
    text: question.text,
    severity: 'reminder',
    explanation: 'Unable to evaluate this question. Please re-answer.',
    suggestedProbes,
    actionProfile: question.actionProfile,
    nextCheckDate: addWeeks(now, ruleset.deltaRepeatWeeks),
  };
}

/**
 * Evaluate a list of questions for a child against their answers.
 * Returns a map of questionId → QuestionResult for convenience.
 */
export function evaluateAll(
  questions: Question[],
  child: Child,
  answers: AnswerEvent[],
  ruleset: Ruleset = DEFAULT_RULESET,
  now: Date = new Date(),
): Map<string, QuestionResult> {
  const results = new Map<string, QuestionResult>();
  for (const q of questions) {
    results.set(q.id, evaluateQuestion(q, child, answers, ruleset, now));
  }
  return results;
}
