import type {
  DomainTag,
  DomainAssessment,
  DomainStatus,
  DomainVector,
  QuestionResult,
  AnswerEvent,
  Severity,
  Confidence,
} from './types.js';
import { getQuestionsByDomain, getQuestionById } from './question-bank.js';

// ---------------------------------------------------------------------------
// Domain display name mapping
// ---------------------------------------------------------------------------

export const DOMAIN_DISPLAY_NAMES: Record<DomainTag, string> = {
  GM: 'Gross Motor',
  FM: 'Fine Motor',
  RL: 'Receptive Language',
  EL: 'Expressive Language',
  SE: 'Social-Emotional',
  CP: 'Cognitive / Play',
  SH: 'Self-Help / Adaptive',
  VH: 'Vision / Hearing',
  RF: 'Red Flags',
};

// ---------------------------------------------------------------------------
// Severity ordering for comparisons
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<Severity, number> = {
  normal: 0,
  reminder: 1,
  watch: 2,
  precaution: 3,
  warning: 4,
  flag: 5,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if `a` is more severe than `b`. */
function moreSevere(a: Severity, b: Severity): boolean {
  return SEVERITY_ORDER[a] > SEVERITY_ORDER[b];
}

function computeConfidence(
  answeredCount: number,
  totalInDomain: number,
): Confidence {
  if (answeredCount === 0) return 'low';
  const ratio = answeredCount / Math.max(totalInDomain, 1);
  if (ratio >= 0.7 && answeredCount >= 3) return 'high';
  if (ratio >= 0.4 || answeredCount >= 2) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Core scoring
// ---------------------------------------------------------------------------

/**
 * Score a single domain given the QuestionResults for that domain.
 *
 * @param domainTag         The domain to score (e.g. 'GM', 'EL').
 * @param questionResults   Array of QuestionResult objects for questions in
 *                          this domain (may span multiple domains per question).
 * @param answers           All answer events (used for evidence sufficiency).
 */
export function scoreDomain(
  domainTag: DomainTag,
  questionResults: QuestionResult[],
  answers: AnswerEvent[],
): DomainAssessment {
  const displayName = DOMAIN_DISPLAY_NAMES[domainTag];

  // The total number of questions that exist for this domain in the bank
  // (for confidence estimation)
  const allDomainQuestions = getQuestionsByDomain(domainTag);

  // Build the domain vector
  let flagCount = 0;
  let warningCount = 0;
  let precautionCount = 0;
  let streakMissed = 0;
  let currentStreak = 0;
  let maxStreak = 0;
  let criticalMilestoneMissed = false;
  let totalWeightedPoints = 0;

  const triggeringMilestones: string[] = [];

  // Count actually answered (non-reminder) questions for confidence
  const answeredCount = questionResults.filter(
    (qr) => qr.severity !== 'reminder',
  ).length;

  // Sort by normativeAgeMonths so streak calculation reflects developmental
  // sequence rather than arbitrary array order.
  const sortedResults = [...questionResults].sort((a, b) => {
    const qA = getQuestionById(a.questionId);
    const qB = getQuestionById(b.questionId);
    return (qA?.normativeAgeMonths ?? 0) - (qB?.normativeAgeMonths ?? 0);
  });

  for (const qr of sortedResults) {
    const sev = qr.severity;

    // Weight accumulation: use crude point mapping
    switch (sev) {
      case 'flag':
        totalWeightedPoints += 3;
        flagCount++;
        currentStreak++;
        triggeringMilestones.push(qr.text);
        criticalMilestoneMissed = true; // any flag = critical miss
        break;
      case 'warning':
        totalWeightedPoints += 2;
        warningCount++;
        currentStreak++;
        triggeringMilestones.push(qr.text);
        break;
      case 'precaution':
        totalWeightedPoints += 1;
        precautionCount++;
        currentStreak++;
        break;
      default:
        // normal / watch / reminder reset the consecutive streak
        if (currentStreak > maxStreak) maxStreak = currentStreak;
        currentStreak = 0;
    }
  }
  // Close out the last streak
  if (currentStreak > maxStreak) maxStreak = currentStreak;
  streakMissed = maxStreak;

  const confidence = computeConfidence(answeredCount, allDomainQuestions.length);

  const vector: DomainVector = {
    flagCount,
    warningCount,
    precautionCount,
    streakMissed,
    criticalMilestoneMissed,
    confidence,
    totalWeightedPoints,
  };

  // -------------------------------------------------------------------------
  // Status determination
  // -------------------------------------------------------------------------
  let status: DomainStatus;
  let explanation: string;

  // Evidence sufficiency gate: if fewer than 2 answered observations, we can
  // only report 'insufficient_evidence' UNLESS there is a critical milestone miss
  // (flag), which bypasses the gate.
  if (answeredCount < 2 && !criticalMilestoneMissed) {
    status = 'insufficient_evidence';
    explanation =
      `Not enough observations to assess ${displayName} reliably. ` +
      `Please answer at least 2 questions in this domain.`;
  } else if (flagCount >= 1 || criticalMilestoneMissed) {
    // Glascoe 2005: a single flagged milestone in a domain where other
    // milestones are achieved represents an isolated delay, not a pattern of
    // domain-wide concern. Downgrade to low_concern (monitor) when the
    // majority of observations are normal.
    // AAP (Lipkin & Macias 2020): isolated delays warrant continued
    // monitoring and re-evaluation, not immediate high-concern classification.
    const normalCount = questionResults.filter(
      (qr) => qr.severity === 'normal',
    ).length;
    if (flagCount === 1 && normalCount >= 1) {
      status = 'low_concern';
      explanation =
        `${displayName} has 1 flagged milestone but ${normalCount} other milestone(s) achieved. ` +
        `This appears to be an isolated delay — continue monitoring and re-check soon.`;
    } else {
      status = 'high_concern';
      explanation =
        `${displayName} has ${flagCount} flagged milestone(s) that are significantly overdue. ` +
        `Prompt discussion with a clinician is recommended.`;
    }
  } else if (warningCount >= 2 || (warningCount >= 1 && streakMissed >= 2)) {
    status = 'moderate_concern';
    explanation =
      `${displayName} shows ${warningCount} warning(s) and a streak of ${streakMissed} missed milestones. ` +
      `Closer monitoring is advised.`;
  } else if (warningCount >= 1 || precautionCount >= 2) {
    status = 'low_concern';
    explanation =
      `${displayName} has some milestones that are slightly delayed. ` +
      `Continue monitoring and re-check in the coming weeks.`;
  } else if (precautionCount >= 1) {
    status = 'watch';
    explanation =
      `${displayName} has one milestone approaching its grace window. ` +
      `No action needed yet — re-check soon.`;
  } else {
    status = 'normal';
    explanation = `${displayName} is progressing as expected.`;
  }

  return {
    domain: displayName,
    domainTag,
    vector,
    status,
    explanation,
    triggeringMilestones,
    questionCount: questionResults.length,
  };
}

/**
 * Score all domains from a flat list of question results.
 *
 * Questions can belong to multiple domains; they are included in each
 * relevant domain's scoring.
 *
 * @param allResults  All evaluated QuestionResult objects.
 * @param answers     All answer events (for confidence gating).
 * @param domainTags  Domains to score. Defaults to all non-RF domains.
 */
export function scoreAllDomains(
  allResults: QuestionResult[],
  answers: AnswerEvent[],
  domainTags: DomainTag[] = ['GM', 'FM', 'RL', 'EL', 'SE', 'CP', 'SH', 'VH'],
): Record<string, DomainAssessment> {
  // Build a lookup: questionId -> QuestionResult
  const resultByQid = new Map<string, QuestionResult>(
    allResults.map((qr) => [qr.questionId, qr]),
  );

  const output: Record<string, DomainAssessment> = {};

  for (const tag of domainTags) {
    const domainQuestions = getQuestionsByDomain(tag);
    const domainResults = domainQuestions
      .map((q) => resultByQid.get(q.id))
      .filter((qr): qr is QuestionResult => qr !== undefined);

    output[tag] = scoreDomain(tag, domainResults, answers);
  }

  return output;
}
