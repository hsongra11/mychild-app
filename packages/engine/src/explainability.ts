import type {
  Explanation,
  ScreeningResult,
  Severity,
  QuestionResult,
} from './types.js';
import { getQuestionById } from './question-bank.js';
import { DEFAULT_RULESET } from './defaults.js';
import type { Ruleset } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_LABEL: Record<Severity, string> = {
  normal: 'Normal — milestone achieved',
  reminder: 'Reminder — not yet answered',
  watch: 'Watch — caregiver unsure',
  precaution: 'Precaution — approaching deadline',
  warning: 'Warning — slightly past expected window',
  flag: 'Flag — significantly overdue or red flag',
};

const SEVERITY_RULE: Record<Severity, string> = {
  normal: 'Answer was "achieved"; no further evaluation needed.',
  reminder:
    'Question not yet answered or skipped; scheduled for next check-in.',
  watch:
    'Answer was "unsure"; probes suggested to clarify before re-evaluation.',
  precaution:
    'Answer was "not yet" and child is within the grace window past the normative age.',
  warning:
    'Answer was "not yet" and child is beyond the grace window by less than one month.',
  flag: 'Answer was "not yet" and child is one or more months past the grace window, or this is a universal red-flag question.',
};

function ageDescription(ageMonths: number): string {
  if (ageMonths < 3) return 'the newborn period (0–3 months)';
  if (ageMonths < 6) return 'the early infant period (3–6 months)';
  if (ageMonths < 9) return 'the mid-infant period (6–9 months)';
  if (ageMonths < 12) return 'the late infant period (9–12 months)';
  if (ageMonths < 18) return 'the early toddler period (12–18 months)';
  if (ageMonths < 24) return 'the mid-toddler period (18–24 months)';
  if (ageMonths < 30) return 'the late toddler period (24–30 months)';
  return 'the preschool period (30+ months)';
}

function whyThisAgeMatters(normativeAgeMonths: number): string {
  if (normativeAgeMonths === 0) {
    return (
      'This is a universal red-flag item monitored throughout the 0–36 month window. ' +
      'Any concern should be evaluated promptly regardless of age.'
    );
  }

  const period = ageDescription(normativeAgeMonths);
  return (
    `This milestone is typically reached during ${period}. ` +
    `Milestones build on each other sequentially; delays at this stage can affect ` +
    `the development of later, more complex skills if not addressed early.`
  );
}

function recommendedAction(severity: Severity, qr: QuestionResult): string {
  switch (severity) {
    case 'normal':
      return 'No action required. Continue supporting your child\'s development through play and daily routines.';
    case 'reminder':
      return 'Please answer this question at your next check-in.';
    case 'watch':
      return (
        'Use the suggested probes to clarify whether this milestone has been reached. ' +
        'Re-check within 2 weeks.'
      );
    case 'precaution':
      return (
        'Continue providing opportunities for this skill to develop. ' +
        'Re-check in 2–4 weeks. No clinical action needed yet.'
      );
    case 'warning':
      return (
        'Try the suggested home activities and re-check within 2–4 weeks. ' +
        'If still "not yet" at the next check, mention it at your doctor\'s visit.'
      );
    case 'flag':
      return (
        'Please discuss this milestone with your child\'s doctor within the next ' +
        '2–4 weeks. Do not wait for the next routine visit if you are worried.'
      );
  }
}

function nextCheckWeeksForSeverity(
  severity: Severity,
  isInfant: boolean,
  ruleset: Ruleset,
): number {
  switch (severity) {
    case 'normal':
      return 12; // routine next check
    case 'reminder':
      return ruleset.deltaRepeatWeeks;
    case 'watch':
      return ruleset.deltaUnsureWeeks;
    case 'precaution':
      return isInfant ? ruleset.deltaNotYetWeeks.infant : ruleset.deltaNotYetWeeks.toddler;
    case 'warning':
      return isInfant ? ruleset.deltaNotYetWeeks.infant : ruleset.deltaNotYetWeeks.toddler;
    case 'flag':
      return 2; // urgent — re-check within 2 weeks or sooner
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Produce a human-readable Explanation for why a particular question was
 * assigned its severity.
 *
 * @param result      The full ScreeningResult produced by evaluate().
 * @param questionId  The question to explain.
 * @param ruleset     Optional ruleset used for the evaluation.
 */
export function explainResult(
  result: ScreeningResult,
  questionId: string,
  ruleset: Ruleset = DEFAULT_RULESET,
): Explanation {
  const qr = result.questions.find((q) => q.questionId === questionId);
  if (!qr) {
    throw new Error(`Question "${questionId}" not found in the screening result.`);
  }

  const question = getQuestionById(questionId);
  const normativeAgeMonths = question?.normativeAgeMonths ?? 0;
  const childAgeMonths = result.childAge.useCorrectedAge
    ? result.childAge.correctedMonths
    : result.childAge.chronologicalMonths;
  const infant = childAgeMonths < 12;

  // Build input factors list
  const inputFactors: string[] = [
    `Child's age: ${childAgeMonths.toFixed(1)} months ` +
      (result.childAge.useCorrectedAge ? '(corrected)' : '(chronological)'),
    `Milestone normative age: ${normativeAgeMonths > 0 ? `${normativeAgeMonths} months` : 'N/A (universal red flag)'}`,
    `Answer recorded: ${qr.severity === 'reminder' ? 'not answered' : qr.severity}`,
    `Evidence strength: ${question?.evidenceStrength ?? 'unknown'}`,
    `Domain(s): ${question?.tags.join(', ') ?? 'unknown'}`,
  ];

  if (result.childAge.isPreterm) {
    inputFactors.push(
      `Preterm adjustment: ${result.childAge.weeksEarly} weeks early — ` +
        (result.childAge.useCorrectedAge ? 'using corrected age' : 'using chronological age (≥ 24 months)'),
    );
  }

  if (normativeAgeMonths > 0 && childAgeMonths > normativeAgeMonths) {
    const graceWeeks = infant ? ruleset.graceWeeks.infant : ruleset.graceWeeks.toddler;
    inputFactors.push(
      `Grace window: ${graceWeeks} weeks past normative age (until ${(normativeAgeMonths + graceWeeks / 4.34524).toFixed(1)} months)`,
    );
  }

  return {
    questionId,
    inputFactors,
    appliedRule: SEVERITY_RULE[qr.severity],
    outputSeverity: qr.severity,
    whyThisAgeMatters: whyThisAgeMatters(normativeAgeMonths),
    recommendedAction: recommendedAction(qr.severity, qr),
    nextCheckWeeks: nextCheckWeeksForSeverity(qr.severity, infant, ruleset),
  };
}
