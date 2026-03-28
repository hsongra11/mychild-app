export interface Child {
  dob: Date;
  gestationalWeeks?: number; // undefined = full-term, <37 = preterm
}

export interface AnswerEvent {
  questionId: string;
  answer: 'achieved' | 'not_yet' | 'unsure' | 'skipped';
  timestamp: Date;
  probeResponses?: Record<string, string>;
  note?: string;
}

export type Severity = 'normal' | 'precaution' | 'warning' | 'flag' | 'watch' | 'reminder';

export type DomainTag = 'GM' | 'FM' | 'RL' | 'EL' | 'SE' | 'CP' | 'SH' | 'VH' | 'RF';

export type WeightClass = 'L' | 'M' | 'H' | 'RF';

export type EscalationRule = 'R1' | 'R2' | 'R3' | 'R4' | 'R1_R2';

export type EvidenceStrength = 'High' | 'Moderate' | 'Low';

export type ActionProfileType =
  | 'AP-STD'
  | 'AP-LANG'
  | 'AP-MOTOR'
  | 'AP-SENS'
  | 'AP-RF'
  | 'AP-ADAPT'
  | 'AP-TOILET';

export type DomainStatus =
  | 'high_concern'
  | 'moderate_concern'
  | 'low_concern'
  | 'watch'
  | 'insufficient_evidence'
  | 'normal';

export type Confidence = 'high' | 'medium' | 'low';

export interface QuestionCitation {
  source: string;
  reference: string;
  normativeBasis: string;
}

export interface Question {
  id: string;
  text: string;
  subtext?: string;
  tags: DomainTag[];
  askWindow: { minMonths: number; maxMonths: number };
  normativeAgeMonths: number;
  evidenceStrength: EvidenceStrength;
  weight: WeightClass;
  escalationRule: EscalationRule;
  escalationCondition: string;
  probes: string[];
  actionProfile: ActionProfileType;
  activityId: string | null;
  notes: string;
  citation?: QuestionCitation;
}

export interface AgeResult {
  chronologicalDays: number;
  chronologicalMonths: number;
  chronologicalWeeks: number;
  correctedDays: number;
  correctedMonths: number;
  correctedWeeks: number;
  weeksEarly: number;
  isPreterm: boolean;
  useCorrectedAge: boolean; // false after 24 months chronological
}

export interface DomainVector {
  flagCount: number;
  warningCount: number;
  precautionCount: number;
  streakMissed: number;
  criticalMilestoneMissed: boolean;
  confidence: Confidence;
  totalWeightedPoints: number;
}

export interface DomainAssessment {
  domain: string; // display name like "Gross Motor", "Expressive Language", etc.
  domainTag: DomainTag;
  vector: DomainVector;
  status: DomainStatus;
  explanation: string;
  triggeringMilestones: string[];
  questionCount: number;
}

export interface QuestionResult {
  questionId: string;
  text: string;
  severity: Severity;
  explanation: string;
  suggestedProbes: string[];
  actionProfile: ActionProfileType;
  nextCheckDate?: Date;
  regressionDetected?: boolean;
}

export interface GlobalStatus {
  level: 'green' | 'yellow' | 'orange' | 'red';
  message: string;
}

export interface Action {
  type:
    | 'recheck'
    | 'coaching'
    | 'clinician_discussion'
    | 'specialist_referral'
    | 'screening_referral';
  description: string;
  urgency: 'routine' | 'soon' | 'urgent';
  questionIds: string[];
}

export interface ScreeningResult {
  childAge: AgeResult;
  questions: QuestionResult[];
  domains: Record<string, DomainAssessment>;
  globalStatus: GlobalStatus;
  nextActions: Action[];
  disclaimer: string;
}

export interface Explanation {
  questionId: string;
  inputFactors: string[];
  appliedRule: string;
  outputSeverity: Severity;
  whyThisAgeMatters: string;
  recommendedAction: string;
  nextCheckWeeks: number;
}

// Simulator types
export interface Trajectory {
  id: string;
  name: string;
  description: string;
  child: { dob: string; gestationalWeeks?: number };
  events: {
    weekOffset: number;
    questionId: string;
    answer: 'achieved' | 'not_yet' | 'unsure';
  }[];
}

export interface TimelineEvent {
  weekOffset: number;
  questionId: string;
  answer: string;
  severity: Severity;
  domainStatuses: Record<string, DomainStatus>;
}

export interface AlertDiff {
  trajectoryId: string;
  questionId: string;
  weekOffset: number;
  baselineSeverity: Severity;
  newSeverity: Severity;
  reason: string;
}

export interface TrajectoryResult {
  trajectoryId: string;
  trajectoryName: string;
  timeline: TimelineEvent[];
  finalDomainStatus: Record<string, DomainAssessment>;
}

export interface SimulationResult {
  trajectories: TrajectoryResult[];
  diffs: AlertDiff[];
}

export interface Ruleset {
  version: string;
  thresholds: {
    T_yellow: number; // default 2
    T_orange: number; // default 4
    T_red: number;    // default 6
  };
  graceWeeks: {
    infant: number;   // default 4 (< 12 months)
    toddler: number;  // default 6 (>= 12 months)
  };
  deltaNotYetWeeks: {
    infant: number;   // default 2 (< 12 months)
    toddler: number;  // default 4 (>= 12 months)
  };
  deltaUnsureWeeks: number; // default 2
  deltaRepeatWeeks: number; // default 4
  nRepeat: number;          // default 2
  correctedAgeCutoffMonths: number; // default 24
  weightValues: {
    L: { positive: number; negative: number };
    M: { positive: number; negative: number };
    H: { positive: number; negative: number };
    RF: { positive: number; negative: number };
  };
}
