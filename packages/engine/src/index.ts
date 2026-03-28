/**
 * mychild-engine
 *
 * Open-source developmental screening engine with evidence-weighted escalation.
 *
 * DISCLAIMER: This app tracks development and helps you notice changes early.
 * It cannot diagnose. If you are worried, please talk to your child's doctor.
 */

import type {
  Child,
  AnswerEvent,
  Ruleset,
  ScreeningResult,
  AgeResult,
  Question,
  GlobalStatus,
  DomainAssessment,
  QuestionResult,
  Explanation,
  SimulationResult,
  Trajectory,
  DomainTag,
} from './types.js';

import { computeAge } from './corrected-age.js';
import { DEFAULT_RULESET } from './defaults.js';
import {
  getAllQuestions,
  getQuestionById,
  getQuestionsByAgeBand,
  getUniversalRedFlags,
  getQuestionsByDomain,
} from './question-bank.js';
import { evaluateQuestion, evaluateAll } from './rules-engine.js';
import { scoreAllDomains } from './domain-scoring.js';
import { buildActions } from './action-profiles.js';
import { explainResult } from './explainability.js';
import { simulate as simulateTrajectories } from './simulator.js';

// ---------------------------------------------------------------------------
// Disclaimer
// ---------------------------------------------------------------------------

export const DISCLAIMER =
  'This app tracks development and helps you notice changes early. ' +
  'It cannot diagnose. If you are worried, please talk to your child\'s doctor.';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_LEVEL_ORDER = {
  normal: 0,
  reminder: 1,
  watch: 2,
  precaution: 3,
  warning: 4,
  flag: 5,
} as const;

const DOMAIN_STATUS_LEVEL_ORDER = {
  normal: 0,
  insufficient_evidence: 1,
  watch: 2,
  low_concern: 3,
  moderate_concern: 4,
  high_concern: 5,
} as const;

function computeGlobalStatus(
  domains: Record<string, DomainAssessment>,
): GlobalStatus {
  let maxLevel = 0;

  for (const assessment of Object.values(domains)) {
    const level = DOMAIN_STATUS_LEVEL_ORDER[assessment.status] ?? 0;
    if (level > maxLevel) maxLevel = level;
  }

  if (maxLevel >= DOMAIN_STATUS_LEVEL_ORDER.high_concern) {
    return {
      level: 'red',
      message:
        'One or more developmental areas show significant concern. Please discuss with your child\'s doctor soon.',
    };
  }
  if (maxLevel >= DOMAIN_STATUS_LEVEL_ORDER.moderate_concern) {
    return {
      level: 'orange',
      message:
        'Some developmental areas need closer monitoring. Consider discussing with your child\'s doctor at the next visit.',
    };
  }
  if (maxLevel >= DOMAIN_STATUS_LEVEL_ORDER.low_concern) {
    return {
      level: 'yellow',
      message:
        'A few milestones are slightly delayed. Continue monitoring and re-check in the coming weeks.',
    };
  }
  if (maxLevel >= DOMAIN_STATUS_LEVEL_ORDER.watch) {
    return {
      level: 'yellow',
      message:
        'Some responses were uncertain. Use the suggested probes and re-check soon.',
    };
  }

  return {
    level: 'green',
    message: 'Development appears to be on track. Keep up the great work!',
  };
}

/**
 * Determine the effective age in months to use for question window matching.
 * Uses corrected age for preterm children until 24 months chronological.
 */
function effectiveAgeMonths(ageResult: AgeResult): number {
  return ageResult.useCorrectedAge
    ? ageResult.correctedMonths
    : ageResult.chronologicalMonths;
}

// ---------------------------------------------------------------------------
// Core public functions
// ---------------------------------------------------------------------------

/**
 * Compute the child's chronological and corrected age.
 *
 * @param dob               Date of birth.
 * @param gestationalWeeks  Gestational age at birth in weeks. Omit for full-term.
 * @param now               Reference date (defaults to today).
 */
export function computeChildAge(
  dob: Date,
  gestationalWeeks?: number,
  now?: Date,
): AgeResult {
  return computeAge(dob, gestationalWeeks, now);
}

/**
 * Return all questions whose ask-window covers the child's current age,
 * filtered to exclude already-achieved milestones.
 *
 * - Includes universal red flags (always due).
 * - Includes questions due for re-check:
 *   - "not_yet" answered more than deltaNotYet weeks ago.
 *   - "unsure" answered more than deltaUnsure weeks ago.
 * - Enforces deltaRepeat spacing: a question answered within deltaRepeat
 *   weeks is not returned (prevents rapid re-asking of achieved items).
 *
 * @param child     Child demographics.
 * @param answers   All answer events recorded so far.
 * @param ruleset   Ruleset configuration.
 * @param now       Reference date (defaults to today).
 */
export function getDueQuestions(
  child: Child,
  answers: AnswerEvent[],
  ruleset: Ruleset = DEFAULT_RULESET,
  now: Date = new Date(),
): Question[] {
  const ageResult = computeAge(child.dob, child.gestationalWeeks, now);
  const ageMo = effectiveAgeMonths(ageResult);
  const infant = ageMo < 12;

  const deltaNotYetWeeks = infant
    ? ruleset.deltaNotYetWeeks.infant
    : ruleset.deltaNotYetWeeks.toddler;
  const deltaUnsureWeeks = ruleset.deltaUnsureWeeks;
  const deltaRepeatMs = ruleset.deltaRepeatWeeks * 7 * 24 * 60 * 60 * 1000;
  const deltaNotYetMs = deltaNotYetWeeks * 7 * 24 * 60 * 60 * 1000;
  const deltaUnsureMs = deltaUnsureWeeks * 7 * 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();

  // Build a map: questionId -> most-recent AnswerEvent
  const latestAnswer = new Map<string, AnswerEvent>();
  for (const a of answers) {
    const existing = latestAnswer.get(a.questionId);
    if (!existing || a.timestamp.getTime() > existing.timestamp.getTime()) {
      latestAnswer.set(a.questionId, a);
    }
  }

  // Questions in the child's current age window
  const inWindow = getQuestionsByAgeBand(
    Math.max(0, ageMo - 1),
    ageMo + 3, // look slightly ahead
  );

  // Always include universal red flags
  const redFlags = getUniversalRedFlags();
  const redFlagIds = new Set(redFlags.map((q) => q.id));

  const candidateSet = new Map<string, Question>();
  for (const q of [...inWindow, ...redFlags]) {
    candidateSet.set(q.id, q);
  }

  const due: Question[] = [];

  for (const question of candidateSet.values()) {
    const latest = latestAnswer.get(question.id);

    if (!latest) {
      // Never answered — always due if in window or a red flag
      due.push(question);
      continue;
    }

    const lastAnsweredMs = latest.timestamp.getTime();
    const timeSinceLastMs = nowMs - lastAnsweredMs;

    // Skip achieved items entirely (unless it's been a very long time, handled by re-evaluation)
    if (latest.answer === 'achieved') {
      continue;
    }

    // Skip questions answered very recently (within deltaRepeat) to prevent
    // rapid-fire re-asking regardless of answer type
    if (timeSinceLastMs < deltaRepeatMs && !redFlagIds.has(question.id)) {
      continue;
    }

    // "not_yet" — re-ask after deltaNotYet weeks
    if (latest.answer === 'not_yet' && timeSinceLastMs >= deltaNotYetMs) {
      due.push(question);
      continue;
    }

    // "unsure" — re-ask after deltaUnsure weeks
    if (latest.answer === 'unsure' && timeSinceLastMs >= deltaUnsureMs) {
      due.push(question);
      continue;
    }

    // "skipped" — always re-ask
    if (latest.answer === 'skipped') {
      due.push(question);
      continue;
    }
  }

  return due;
}

/**
 * Run a full developmental screening evaluation.
 *
 * Steps:
 *  1. Compute child age (chronological + corrected).
 *  2. Gather all questions in the child's age window, plus universal red flags.
 *  3. Evaluate each answered question through the rules engine.
 *  4. Score each developmental domain.
 *  5. Compute global status from domain severity.
 *  6. Generate prioritised next actions.
 *  7. Attach disclaimer text.
 *
 * @param child     Child demographics.
 * @param answers   All answer events recorded so far.
 * @param ruleset   Ruleset configuration (defaults to DEFAULT_RULESET).
 * @param now       Reference date (defaults to today).
 */
export function evaluate(
  child: Child,
  answers: AnswerEvent[],
  ruleset: Ruleset = DEFAULT_RULESET,
  now: Date = new Date(),
): ScreeningResult {
  // 1. Compute age
  const childAge = computeAge(child.dob, child.gestationalWeeks, now);
  const ageMo = effectiveAgeMonths(childAge);

  // 2. Get all questions relevant to this child's age + universal red flags
  const inWindowQuestions = getQuestionsByAgeBand(
    Math.max(0, ageMo - 2),
    ageMo + 2,
  );
  const redFlags = getUniversalRedFlags();
  const allRelevantIds = new Set<string>();
  const allRelevantQuestions: Question[] = [];

  for (const q of [...inWindowQuestions, ...redFlags]) {
    if (!allRelevantIds.has(q.id)) {
      allRelevantIds.add(q.id);
      allRelevantQuestions.push(q);
    }
  }

  // Also include any questions that have answers recorded outside the window
  // (they may have been answered in a previous session and should be counted)
  const answeredIds = new Set(answers.map((a) => a.questionId));
  for (const id of answeredIds) {
    if (!allRelevantIds.has(id)) {
      const q = getQuestionById(id);
      if (q) {
        allRelevantIds.add(id);
        allRelevantQuestions.push(q);
      }
    }
  }

  // 3. Evaluate each question
  const resultMap = evaluateAll(
    allRelevantQuestions,
    child,
    answers,
    ruleset,
    now,
  );

  const questionResults: QuestionResult[] = Array.from(resultMap.values());

  // 4. Score domains (excluding RF domain — it's handled via question severity)
  const domains = scoreAllDomains(
    questionResults,
    answers,
    ['GM', 'FM', 'RL', 'EL', 'SE', 'CP', 'SH', 'VH'],
  );

  // 5. Compute global status
  const globalStatus = computeGlobalStatus(domains);

  // 6. Generate next actions — only from questions that have an actual answer
  const actionableResults = questionResults.filter((qr) => {
    const a = answers.find((ev) => ev.questionId === qr.questionId);
    return a !== undefined;
  });
  const nextActions = buildActions(actionableResults);

  // 7. Return full result
  return {
    childAge,
    questions: questionResults,
    domains,
    globalStatus,
    nextActions,
    disclaimer: DISCLAIMER,
  };
}

/**
 * Simulate one or more developmental trajectories through the engine.
 *
 * @param ruleset           The ruleset to evaluate with.
 * @param trajectories      Trajectories to simulate.
 * @param baselineRuleset   Optional baseline for diff generation.
 */
export function simulate(
  ruleset: Ruleset = DEFAULT_RULESET,
  trajectories: Trajectory[],
  baselineRuleset?: Ruleset,
): SimulationResult {
  return simulateTrajectories(ruleset, trajectories, baselineRuleset);
}

/**
 * Explain why a specific question received its severity in a screening result.
 *
 * @param result      The ScreeningResult produced by evaluate().
 * @param questionId  The question to explain.
 * @param ruleset     The ruleset used in the evaluation.
 */
export function explain(
  result: ScreeningResult,
  questionId: string,
  ruleset: Ruleset = DEFAULT_RULESET,
): Explanation {
  return explainResult(result, questionId, ruleset);
}

// ---------------------------------------------------------------------------
// Re-exports — types
// ---------------------------------------------------------------------------

export type {
  Child,
  AnswerEvent,
  Ruleset,
  ScreeningResult,
  AgeResult,
  Question,
  QuestionResult,
  GlobalStatus,
  DomainAssessment,
  Explanation,
  SimulationResult,
  Trajectory,
  DomainTag,
  // Additional types
  Severity,
  DomainStatus,
  Confidence,
  DomainVector,
  Action,
  TimelineEvent,
  AlertDiff,
  TrajectoryResult,
  WeightClass,
  EscalationRule,
  EvidenceStrength,
  ActionProfileType,
} from './types.js';

// ---------------------------------------------------------------------------
// Re-exports — question bank
// ---------------------------------------------------------------------------

export {
  getAllQuestions,
  getQuestionById,
  getQuestionsByAgeBand,
  getUniversalRedFlags,
  getQuestionsByDomain,
} from './question-bank.js';

// ---------------------------------------------------------------------------
// Re-exports — sub-modules
// ---------------------------------------------------------------------------

export { DEFAULT_RULESET } from './defaults.js';
export { computeAge } from './corrected-age.js';
export { evaluateQuestion, evaluateAll } from './rules-engine.js';
export { scoreDomain, scoreAllDomains, DOMAIN_DISPLAY_NAMES } from './domain-scoring.js';
export { buildActions, getProfileConfig } from './action-profiles.js';
export { explainResult } from './explainability.js';
export { simulate as simulateRaw } from './simulator.js';
export {
  PROBE_DEFINITIONS,
  resolveProbes,
  resolveProbeDefinitions,
} from './probes.js';
export type { ProbeDefinition } from './probes.js';
