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
  let rfSourcedFlagCount = 0; // flags from RF-weighted questions in non-RF domains
  let warningCount = 0;
  let precautionCount = 0;
  let watchCount = 0;
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

  // CDC 2022: weight multipliers reflect clinical significance of each
  // milestone. High-weight questions (H, RF) carry more diagnostic weight
  // than medium (M) or low (L) questions.
  const WEIGHT_MULTIPLIER: Record<string, number> = {
    RF: 2.0, H: 1.5, M: 1.0, L: 0.5,
  };

  for (const qr of sortedResults) {
    const sev = qr.severity;
    const q = getQuestionById(qr.questionId);
    const wMul = WEIGHT_MULTIPLIER[q?.weight ?? 'M'] ?? 1.0;

    // Weight accumulation: severity base points × question weight multiplier
    switch (sev) {
      case 'flag':
        totalWeightedPoints += 3 * wMul;
        flagCount++;
        if (q?.weight === 'RF' && domainTag !== 'RF') rfSourcedFlagCount++;
        currentStreak++;
        triggeringMilestones.push(qr.text);
        criticalMilestoneMissed = true; // any flag = critical miss
        break;
      case 'warning':
        totalWeightedPoints += 2 * wMul;
        warningCount++;
        currentStreak++;
        triggeringMilestones.push(qr.text);
        break;
      case 'precaution':
        totalWeightedPoints += 1 * wMul;
        precautionCount++;
        currentStreak++;
        break;
      case 'watch':
        watchCount++;
        // watch does not break a streak but does not extend it either
        if (currentStreak > maxStreak) maxStreak = currentStreak;
        currentStreak = 0;
        break;
      default:
        // normal / reminder reset the consecutive streak
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
  // Developmental sequence anomaly: detect when a later milestone is achieved
  // but an earlier one in the same domain is missed (flag/warning/precaution).
  // CDC 2022 (Zubler et al.): developmental skills build sequentially; failure
  // on a foundational milestone when later milestones are achieved may indicate
  // a specific deficit or data quality concern warranting investigation.
  // -------------------------------------------------------------------------
  let sequenceAnomaly = false;
  let latestAchievedAge = -1;
  let earliestMissedAge = Infinity;
  for (const qr of sortedResults) {
    const q = getQuestionById(qr.questionId);
    if (!q) continue;
    if (qr.severity === 'normal') {
      if (q.normativeAgeMonths > latestAchievedAge) {
        latestAchievedAge = q.normativeAgeMonths;
      }
    }
    if (qr.severity === 'flag' || qr.severity === 'warning') {
      if (q.normativeAgeMonths < earliestMissedAge) {
        earliestMissedAge = q.normativeAgeMonths;
      }
    }
  }
  // Anomaly: achieved a milestone at a later age than a missed one,
  // with at least 2 months gap (to avoid edge cases at band boundaries)
  if (latestAchievedAge > earliestMissedAge + 2) {
    sequenceAnomaly = true;
  }

  // -------------------------------------------------------------------------
  // Status determination
  // -------------------------------------------------------------------------
  let status: DomainStatus;
  let explanation: string;

  // CDC 2022 (Zubler et al.): loss of previously acquired skills is a clinical
  // red flag requiring immediate evaluation, regardless of data completeness.
  // AAP (Lipkin & Macias 2020): skill regression is one of the most concerning
  // developmental patterns and should always trigger follow-up.
  const hasRegression = questionResults.some((qr) => qr.regressionDetected);

  // Evidence sufficiency gate: if fewer than 2 answered observations, we can
  // only report 'insufficient_evidence' UNLESS there is a meaningful signal
  // (flag, warning, or regression) that bypasses the gate.
  // CDC 2022 / AAP 2020: even sparse data with a concerning signal should not
  // be dismissed — a single missed milestone is still clinically actionable.
  const hasMeaningfulSignal =
    criticalMilestoneMissed || hasRegression || warningCount >= 1;
  if (answeredCount < 2 && !hasMeaningfulSignal) {
    status = 'insufficient_evidence';
    explanation =
      `Not enough observations to assess ${displayName} reliably. ` +
      `Please answer at least 2 questions in this domain.`;
  } else if (flagCount >= 1 || criticalMilestoneMissed) {
    // CDC 2022 (Zubler et al.): red flag (RF) domain flags should NEVER be
    // downgraded — any red flag failure requires immediate clinical attention
    // regardless of how many other red flags are achieved.
    if (domainTag === 'RF') {
      status = 'high_concern';
      explanation =
        `${displayName} has ${flagCount} flagged red-flag question(s). ` +
        `Red flag failures require prompt discussion with a clinician.`;
    } else {
      // Glascoe 2005: a single flagged milestone in a non-RF domain where the
      // clear majority of observations are normal represents an isolated delay.
      // AAP (Lipkin & Macias 2020): isolated delays warrant continued
      // monitoring and re-evaluation, not immediate high-concern classification.
      const normalCount = questionResults.filter(
        (qr) => qr.severity === 'normal',
      ).length;
      if (flagCount === 1 && normalCount >= 3) {
        status = 'watch';
        explanation =
          `${displayName} has 1 flagged milestone but ${normalCount} other milestone(s) achieved. ` +
          `This appears to be an isolated delay — continue monitoring and re-check soon.`;
      } else if (flagCount === 1 && normalCount >= 2) {
        status = 'low_concern';
        explanation =
          `${displayName} has 1 flagged milestone but ${normalCount} other milestone(s) achieved. ` +
          `This appears to be an isolated delay — continue monitoring and re-check soon.`;
      } else if (rfSourcedFlagCount === flagCount && flagCount === 1 && normalCount >= 1) {
        // CDC 2022 (Zubler et al.): a single RF-weighted question cross-tagged
        // into a developmental domain represents an RF-level concern primarily
        // handled by the RF domain. When the only flag comes from an RF question
        // and domain-specific milestones are achieved, monitor rather than
        // escalate. Multiple RF failures (≥2) indicate a convergent pattern
        // that IS clinically significant for the domain.
        status = 'low_concern';
        explanation =
          `${displayName} has ${flagCount} flagged red-flag question(s) but ${normalCount} ` +
          `domain milestone(s) achieved. The red flag concern is tracked separately — ` +
          `continue monitoring this domain.`;
      } else {
        status = 'high_concern';
        explanation =
          `${displayName} has ${flagCount} flagged milestone(s) that are significantly overdue. ` +
          `Prompt discussion with a clinician is recommended.`;
      }
    }
  } else if (warningCount >= 2 || (warningCount >= 1 && streakMissed >= 2)) {
    status = 'moderate_concern';
    explanation =
      `${displayName} shows ${warningCount} warning(s) and a streak of ${streakMissed} missed milestones. ` +
      `Closer monitoring is advised.`;
  } else if (warningCount >= 1) {
    // CDC 2022 / AAP 2020: a warning means at least one milestone is past
    // the grace window, which is clinically meaningful and warrants
    // moderate-level monitoring regardless of question weight.
    status = 'moderate_concern';
    explanation =
      `${displayName} has a milestone delayed past the grace window. ` +
      `Discuss with your child's doctor at the next visit.`;
  } else if (precautionCount >= 2) {
    // Glascoe 2005: multiple precautions (within grace window) suggest
    // emerging delay. Use weighted points to determine severity.
    // CDC 2022 (Zubler et al.): ≥3 milestones within the grace window in a
    // single domain represents a pervasive pattern warranting escalation
    // regardless of individual question weights.
    if (totalWeightedPoints >= 2 || precautionCount >= 3) {
      status = 'moderate_concern';
      explanation = precautionCount >= 3
        ? `${displayName} has ${precautionCount} milestones approaching their grace window. ` +
          `This pervasive pattern warrants discussion with your child's doctor.`
        : `${displayName} has ${precautionCount} milestones approaching the grace window ` +
          `with significant weighted concern. Discuss with your child's doctor.`;
    } else {
      status = 'low_concern';
      explanation =
        `${displayName} has some milestones that are slightly delayed. ` +
        `Continue monitoring and re-check in the coming weeks.`;
    }
  } else if (precautionCount >= 1) {
    status = 'watch';
    explanation =
      `${displayName} has one milestone approaching its grace window. ` +
      `No action needed yet — re-check soon.`;
  } else if (watchCount >= 3 && answeredCount >= 3) {
    // Glascoe 2005: pervasive caregiver uncertainty across multiple milestones
    // in a domain may signal underlying developmental concern. When 3+ milestones
    // are "unsure" with sufficient evidence, elevate to watch status.
    status = 'watch';
    explanation =
      `${displayName} has ${watchCount} milestones where the caregiver is unsure. ` +
      `This level of uncertainty warrants closer observation — use the suggested ` +
      `probes and re-check soon.`;
  } else {
    status = 'normal';
    explanation = `${displayName} is progressing as expected.`;
  }

  // CDC 2022 (Zubler et al.): loss of previously acquired skills is one of the
  // strongest indicators of developmental concern and warrants immediate
  // clinical evaluation, regardless of how many observations are available.
  // AAP (Lipkin & Macias 2020): regression should always trigger at minimum
  // a moderate_concern classification to ensure clinical follow-up.
  const regressionCount = questionResults.filter(
    (qr) => qr.regressionDetected,
  ).length;
  if (regressionCount >= 2 && status !== 'high_concern') {
    // CDC 2022: multiple regressions in a single domain represent a pattern
    // of skill loss that is highly concerning and warrants urgent evaluation.
    status = 'high_concern';
    explanation =
      `${displayName} shows regression in ${regressionCount} milestones: ` +
      `previously achieved skills are now lost. This pattern of skill loss ` +
      `is a significant clinical concern — please speak with your child's doctor urgently.`;
  } else if (regressionCount === 1 && status !== 'high_concern') {
    status = 'moderate_concern';
    explanation =
      `${displayName} shows regression: a previously achieved milestone is now ` +
      `reported as "not yet." Skill loss is a significant clinical concern — ` +
      `please discuss with your child's doctor promptly.`;
  }

  // CDC 2022 (Zubler et al.): developmental sequence anomalies (later milestones
  // achieved while earlier ones missed) suggest a specific deficit pattern.
  // Bump low-severity statuses up one level when this pattern is detected.
  if (sequenceAnomaly && status === 'normal') {
    status = 'watch';
    explanation =
      `${displayName} shows an unusual pattern: a later milestone is achieved but an ` +
      `earlier one is missed. This may indicate a specific area of difficulty — ` +
      `re-check the missed milestone soon.`;
  } else if (sequenceAnomaly && status === 'watch') {
    status = 'low_concern';
    explanation =
      `${displayName} shows an unusual pattern: later milestones are achieved while ` +
      `earlier ones are delayed, suggesting a specific deficit. Monitor closely.`;
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

  // -------------------------------------------------------------------------
  // Cross-domain correction for sparse high_concern domains.
  // Glascoe 2005: developmental screening should consider converging evidence
  // across domains. A single flagged observation in a sparse domain is less
  // clinically significant when the child shows typical development in other
  // well-observed domains.
  // AAP (Lipkin & Macias 2020): isolated concerns in one domain with otherwise
  // typical development across other domains warrant monitoring, not escalation.
  // -------------------------------------------------------------------------
  const hasNormalSiblingDomain = Object.values(output).some(
    (a) =>
      a.status === 'normal' &&
      a.vector.confidence !== 'low',
  );

  if (hasNormalSiblingDomain) {
    for (const tag of domainTags) {
      const a = output[tag];
      // Never downgrade domains with detected regression — skill loss is
      // always clinically significant regardless of cross-domain context.
      // CDC 2022: regression is an independent red flag.
      const domainQuestions = getQuestionsByDomain(tag);
      const domainResults = domainQuestions
        .map((q) => resultByQid.get(q.id))
        .filter((qr): qr is QuestionResult => qr !== undefined);
      const domainHasRegression = domainResults.some(
        (qr) => qr.regressionDetected,
      );
      if (
        a.status === 'high_concern' &&
        a.vector.flagCount === 1 &&
        a.vector.confidence === 'low' &&
        !domainHasRegression
      ) {
        output[tag] = {
          ...a,
          status: 'low_concern',
          explanation:
            `${a.domain} has 1 flagged milestone but data is sparse and other domains ` +
            `show typical development. Continue monitoring and answer more questions ` +
            `in this domain for a reliable assessment.`,
        };
      }
      // Glascoe 2005 / AAP 2020: a domain with only 2-3 observations and a
      // single flag is still data-sparse even if confidence is technically
      // 'medium'. When other well-observed domains show typical development,
      // this isolated concern warrants monitoring, not immediate escalation.
      // CDC 2022 (Zubler et al.): screening decisions should incorporate
      // converging evidence across developmental domains.
      const domainAnsweredCount = domainResults.filter(
        (qr) => qr.severity !== 'reminder',
      ).length;
      if (
        a.status === 'high_concern' &&
        a.vector.flagCount === 1 &&
        a.vector.confidence === 'medium' &&
        domainAnsweredCount <= 3 &&
        !domainHasRegression
      ) {
        output[tag] = {
          ...a,
          status: 'low_concern',
          explanation:
            `${a.domain} has 1 flagged milestone with limited observations (${domainAnsweredCount}) ` +
            `and other domains show typical development. Continue monitoring and answer ` +
            `more questions in this domain for a reliable assessment.`,
        };
      }
      // Glascoe 2005: a sparse low_concern domain driven only by precautions
      // (within grace window) is less significant when other well-observed
      // domains show typical development. Downgrade to watch.
      if (
        a.status === 'low_concern' &&
        a.vector.flagCount === 0 &&
        a.vector.warningCount === 0 &&
        a.vector.confidence === 'low' &&
        !domainHasRegression
      ) {
        output[tag] = {
          ...a,
          status: 'watch',
          explanation:
            `${a.domain} has some borderline milestones but data is sparse and other ` +
            `domains show typical development. Continue monitoring and answer more ` +
            `questions in this domain.`,
        };
      }
    }
  }

  return output;
}
