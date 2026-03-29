/**
 * Internal consistency validation pipeline.
 *
 * Runs synthetic developmental profiles through the engine and compares
 * the engine's domain-level outputs against ground truth labels.
 *
 * This is NOT clinical validation. It measures whether the engine behaves
 * predictably and consistently across known developmental trajectories.
 */

import type {
  DomainStatus,
  DomainTag,
  AnswerEvent,
  Child,
  DomainAssessment,
  Ruleset,
  QuestionResult,
  Severity,
  Question,
} from './types.js';
import { evaluateQuestion } from './rules-engine.js';
import { scoreAllDomains } from './domain-scoring.js';
import {
  getQuestionById,
  getQuestionsByAgeBand,
  getUniversalRedFlags,
} from './question-bank.js';
import { computeAge } from './corrected-age.js';
import { DEFAULT_RULESET } from './defaults.js';
import type {
  ConfusionMatrix,
  MetricsWithCI,
  DomainMetrics,
  Disagreement,
  ValidationReport,
} from './statistics.js';
import {
  computeMetricsWithCI,
  formatReport,
} from './statistics.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Ground truth label: concern or no_concern */
export type GroundTruthLabel = 'concern' | 'no_concern';

/** A synthetic profile with ground truth labels per domain */
export interface ValidationProfile {
  id: string;
  name: string;
  description: string;
  category: 'typical' | 'speech_delay' | 'motor_delay' | 'global_delay' | 'mixed_regression';
  child: { dob: string; gestationalWeeks?: number };
  events: {
    weekOffset: number;
    questionId: string;
    answer: 'achieved' | 'not_yet' | 'unsure';
  }[];
  groundTruth: Partial<Record<DomainTag, GroundTruthLabel>>;
}

/** Result of validating a single profile */
export interface ProfileValidationResult {
  profileId: string;
  profileName: string;
  category: string;
  domainResults: {
    domain: DomainTag;
    engineStatus: DomainStatus;
    engineClassification: GroundTruthLabel;
    groundTruth: GroundTruthLabel;
    correct: boolean;
  }[];
}

// ---------------------------------------------------------------------------
// Binary threshold
// ---------------------------------------------------------------------------

const CONCERN_STATUSES: Set<DomainStatus> = new Set([
  'high_concern',
  'moderate_concern',
]);

/**
 * Apply binary threshold to a DomainStatus.
 * high_concern or moderate_concern → concern.
 * Everything else → no_concern.
 */
export function classifyDomainStatus(status: DomainStatus): GroundTruthLabel {
  return CONCERN_STATUSES.has(status) ? 'concern' : 'no_concern';
}

/**
 * Normalize a ground truth label to binary classification.
 * External profiles may use finer-grained labels (e.g. 'low_concern',
 * 'watch', 'moderate_concern'). Map them to the binary system:
 *   concern: 'concern', 'high_concern', 'moderate_concern'
 *   no_concern: everything else ('no_concern', 'low_concern', 'watch', etc.)
 *
 * CDC 2022 / Glascoe 2005: the binary concern threshold represents the
 * clinical decision point for referral. Low-concern statuses warrant
 * monitoring but not referral, so they map to no_concern in binary.
 */
function normalizeGroundTruth(label: string): GroundTruthLabel {
  const concernLabels = new Set(['concern', 'high_concern', 'moderate_concern']);
  return concernLabels.has(label) ? 'concern' : 'no_concern';
}

// ---------------------------------------------------------------------------
// Single profile validation
// ---------------------------------------------------------------------------

const SEVERITY_LEVEL_ORDER: Record<Severity, number> = {
  normal: 0,
  reminder: 1,
  watch: 2,
  precaution: 3,
  warning: 4,
  flag: 5,
};

/**
 * Run the full public evaluation pipeline on a profile.
 * Mirrors the logic in index.ts evaluate() including regression detection.
 */
function evaluateProfileFull(
  child: Child,
  answers: AnswerEvent[],
  ruleset: Ruleset,
  now: Date,
): Record<string, DomainAssessment> {
  const ageResult = computeAge(child.dob, child.gestationalWeeks, now);
  const ageMo = ageResult.useCorrectedAge
    ? ageResult.correctedMonths
    : ageResult.chronologicalMonths;

  // Gather all relevant questions (same logic as index.ts evaluate())
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

  // Include any questions that have answers recorded outside the window
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

  // Evaluate each question
  const resultMap = new Map<string, QuestionResult>();
  for (const q of allRelevantQuestions) {
    resultMap.set(q.id, evaluateQuestion(q, child, answers, ruleset, now));
  }
  const questionResults: QuestionResult[] = Array.from(resultMap.values());

  // Regression detection (mirrors index.ts lines 320-359)
  const answersByQuestion = new Map<string, AnswerEvent[]>();
  for (const a of answers) {
    const arr = answersByQuestion.get(a.questionId);
    if (arr) arr.push(a);
    else answersByQuestion.set(a.questionId, [a]);
  }

  for (const qr of questionResults) {
    const history = answersByQuestion.get(qr.questionId);
    if (!history || history.length < 2) continue;

    const sorted = [...history].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    const latest = sorted[sorted.length - 1];

    const hadAchieved = sorted
      .slice(0, -1)
      .some((a) => a.answer === 'achieved');

    if (!hadAchieved) continue;

    // CDC 2022 (Zubler et al.): loss of previously acquired skills is a
    // clinical red flag. Hard regression (not_yet) and soft regression
    // (unsure after achieved) both warrant detection.
    if (latest.answer === 'not_yet') {
      qr.regressionDetected = true;
      const severityLevel = SEVERITY_LEVEL_ORDER[qr.severity] ?? 0;
      if (severityLevel < SEVERITY_LEVEL_ORDER.warning) {
        qr.severity = 'warning';
        qr.explanation =
          qr.explanation +
          ' NOTE: This milestone was previously achieved but is now reported as "not yet" — ' +
          'this regression pattern warrants closer attention.';
      }
    } else if (latest.answer === 'unsure') {
      // AAP (Lipkin & Macias 2020): uncertainty about a previously
      // demonstrated skill may indicate emerging regression.
      qr.regressionDetected = true;
      const severityLevel = SEVERITY_LEVEL_ORDER[qr.severity] ?? 0;
      if (severityLevel < SEVERITY_LEVEL_ORDER.precaution) {
        qr.severity = 'precaution';
        qr.explanation =
          qr.explanation +
          ' NOTE: This milestone was previously achieved but the caregiver is now unsure — ' +
          'this may indicate emerging regression. Monitor closely and re-check soon.';
      }
    }
  }

  // Score domains
  return scoreAllDomains(
    questionResults,
    answers,
    ['GM', 'FM', 'RL', 'EL', 'SE', 'CP', 'SH', 'VH'],
  );
}

/**
 * Run a single validation profile through the FULL engine pipeline
 * (including regression detection) and compare ALL 8 domains to ground truth.
 */
export function validateProfile(profile: ValidationProfile): ProfileValidationResult {
  const dob = new Date(profile.child.dob);
  const child: Child = {
    dob,
    gestationalWeeks: profile.child.gestationalWeeks,
  };

  // Sort events chronologically
  const sortedEvents = [...profile.events].sort(
    (a, b) => a.weekOffset - b.weekOffset,
  );

  // Build answer history
  const answers: AnswerEvent[] = sortedEvents.map((event) => ({
    questionId: event.questionId,
    answer: event.answer,
    timestamp: new Date(dob.getTime() + event.weekOffset * 7 * 24 * 60 * 60 * 1000),
  }));

  // Determine evaluation time (last event)
  const lastEvent = sortedEvents[sortedEvents.length - 1];
  const now = lastEvent
    ? new Date(dob.getTime() + lastEvent.weekOffset * 7 * 24 * 60 * 60 * 1000)
    : new Date();

  // Run FULL engine evaluation (same path as public evaluate())
  const domainAssessments = evaluateProfileFull(child, answers, DEFAULT_RULESET, now);

  // Compare ALL labeled domains to ground truth
  const domainResults: ProfileValidationResult['domainResults'] = [];

  for (const [tag, label] of Object.entries(profile.groundTruth)) {
    const domainTag = tag as DomainTag;
    const assessment = domainAssessments[domainTag];
    const normalizedLabel = normalizeGroundTruth(label);

    if (!assessment) {
      domainResults.push({
        domain: domainTag,
        engineStatus: 'insufficient_evidence',
        engineClassification: 'no_concern',
        groundTruth: normalizedLabel,
        correct: normalizedLabel === 'no_concern',
      });
      continue;
    }

    const engineClassification = classifyDomainStatus(assessment.status);

    domainResults.push({
      domain: domainTag,
      engineStatus: assessment.status,
      engineClassification,
      groundTruth: normalizedLabel,
      correct: engineClassification === normalizedLabel,
    });
  }

  return {
    profileId: profile.id,
    profileName: profile.name,
    category: profile.category,
    domainResults,
  };
}

// ---------------------------------------------------------------------------
// Full validation run
// ---------------------------------------------------------------------------

/**
 * Run all profiles through the engine and compute aggregate metrics.
 */
export function runValidation(profiles: ValidationProfile[]): {
  profileResults: ProfileValidationResult[];
  report: ValidationReport;
} {
  const profileResults = profiles.map(validateProfile);

  // Aggregate confusion matrices per domain and globally
  // Track insufficient_evidence separately (abstentions)
  const domainMatrices: Record<string, ConfusionMatrix> = {};
  const globalMatrix: ConfusionMatrix = { tp: 0, fp: 0, tn: 0, fn: 0 };
  let abstentionCount = 0;
  let abstentionCorrect = 0;
  const disagreements: Disagreement[] = [];

  for (let i = 0; i < profileResults.length; i++) {
    const result = profileResults[i];
    const profile = profiles[i];
    for (const dr of result.domainResults) {
      if (!domainMatrices[dr.domain]) {
        domainMatrices[dr.domain] = { tp: 0, fp: 0, tn: 0, fn: 0 };
      }
      const m = domainMatrices[dr.domain];

      // Track abstentions separately
      if (dr.engineStatus === 'insufficient_evidence') {
        abstentionCount++;
        if (dr.groundTruth === 'no_concern') abstentionCorrect++;
        // Still count in confusion matrix but flag it
      }

      // Track disagreements
      if (!dr.correct) {
        disagreements.push({
          profileId: result.profileId,
          profileName: result.profileName,
          domain: dr.domain,
          engineClassification: dr.engineClassification,
          expectedClassification: dr.groundTruth,
          engineStatus: dr.engineStatus,
          description: profile.description,
        });
      }

      if (dr.groundTruth === 'concern' && dr.engineClassification === 'concern') {
        m.tp++;
        globalMatrix.tp++;
      } else if (dr.groundTruth === 'no_concern' && dr.engineClassification === 'concern') {
        m.fp++;
        globalMatrix.fp++;
      } else if (dr.groundTruth === 'no_concern' && dr.engineClassification === 'no_concern') {
        m.tn++;
        globalMatrix.tn++;
      } else if (dr.groundTruth === 'concern' && dr.engineClassification === 'no_concern') {
        m.fn++;
        globalMatrix.fn++;
      }
    }
  }

  // Compute metrics
  const globalMetrics = computeMetricsWithCI(globalMatrix);

  const domainTags: DomainTag[] = ['GM', 'FM', 'RL', 'EL', 'SE', 'CP', 'SH', 'VH'];
  const domainDisplayNames: Record<string, string> = {
    GM: 'Gross Motor',
    FM: 'Fine Motor',
    RL: 'Receptive Language',
    EL: 'Expressive Language',
    SE: 'Social-Emotional',
    CP: 'Cognitive / Play',
    SH: 'Self-Help / Adaptive',
    VH: 'Vision / Hearing',
  };

  const domainMetrics: DomainMetrics[] = domainTags
    .filter((tag) => domainMatrices[tag])
    .map((tag) => ({
      domain: domainDisplayNames[tag] ?? tag,
      confusionMatrix: domainMatrices[tag],
      metrics: computeMetricsWithCI(domainMatrices[tag]),
    }));

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    engineVersion: '0.2.0',
    profileCount: profiles.length,
    globalMetrics,
    domainMetrics,
    abstentions: {
      total: abstentionCount,
      correctlyNegative: abstentionCorrect,
      incorrectlyNegative: abstentionCount - abstentionCorrect,
    },
    disagreements,
    disclaimer:
      'Internal Consistency Verification — this study measures whether the engine ' +
      'produces expected outputs for hand-labeled synthetic developmental profiles. ' +
      'It does NOT measure clinical sensitivity/specificity against a gold standard.',
  };

  return { profileResults, report };
}

/**
 * Run validation and return the formatted markdown report.
 */
export function runValidationReport(profiles: ValidationProfile[]): string {
  const { report } = runValidation(profiles);
  return formatReport(report);
}

/**
 * Run validation and return the structured JSON result.
 */
export function runValidationJSON(profiles: ValidationProfile[]): {
  profileResults: ProfileValidationResult[];
  report: ValidationReport;
} {
  return runValidation(profiles);
}
