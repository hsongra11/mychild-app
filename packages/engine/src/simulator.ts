import type {
  Ruleset,
  Trajectory,
  SimulationResult,
  TrajectoryResult,
  TimelineEvent,
  AlertDiff,
  Child,
  AnswerEvent,
  DomainStatus,
  Severity,
} from './types.js';
import { getQuestionById, getUniversalRedFlags } from './question-bank.js';
import { evaluateQuestion } from './rules-engine.js';
import { scoreAllDomains } from './domain-scoring.js';
import { DEFAULT_RULESET } from './defaults.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<Severity, number> = {
  normal: 0,
  reminder: 1,
  watch: 2,
  precaution: 3,
  warning: 4,
  flag: 5,
};

function dateFromWeekOffset(dob: Date, weekOffset: number): Date {
  const d = new Date(dob.getTime());
  d.setTime(d.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000);
  return d;
}

/**
 * Run a single trajectory through the engine and produce a TrajectoryResult.
 */
function runTrajectory(
  trajectory: Trajectory,
  ruleset: Ruleset,
): TrajectoryResult {
  const dob = new Date(trajectory.child.dob);
  const child: Child = {
    dob,
    gestationalWeeks: trajectory.child.gestationalWeeks,
  };

  // Sort events by week offset so we replay in chronological order
  const sortedEvents = [...trajectory.events].sort(
    (a, b) => a.weekOffset - b.weekOffset,
  );

  const accumulatedAnswers: AnswerEvent[] = [];
  const timeline: TimelineEvent[] = [];

  for (const event of sortedEvents) {
    const now = dateFromWeekOffset(dob, event.weekOffset);

    // Record the answer
    const answer: AnswerEvent = {
      questionId: event.questionId,
      answer: event.answer,
      timestamp: now,
    };
    accumulatedAnswers.push(answer);

    // Evaluate the just-answered question
    const question = getQuestionById(event.questionId);
    if (!question) continue; // skip unknown questions

    const qResult = evaluateQuestion(question, child, accumulatedAnswers, ruleset, now);

    // Score all domains with everything answered so far
    // We need to evaluate ALL questions that have been answered for domain scoring
    const allAnsweredQids = new Set(accumulatedAnswers.map((a) => a.questionId));
    const answeredQuestions = Array.from(allAnsweredQids)
      .map((id) => getQuestionById(id))
      .filter((q): q is NonNullable<typeof q> => q !== null && q !== undefined);

    const allResults = answeredQuestions.map((q) =>
      evaluateQuestion(q, child, accumulatedAnswers, ruleset, now),
    );

    const domainAssessments = scoreAllDomains(allResults, accumulatedAnswers);

    const domainStatuses: Record<string, DomainStatus> = {};
    for (const [tag, assessment] of Object.entries(domainAssessments)) {
      domainStatuses[tag] = assessment.status;
    }

    timeline.push({
      weekOffset: event.weekOffset,
      questionId: event.questionId,
      answer: event.answer,
      severity: qResult.severity,
      domainStatuses,
    });
  }

  // Compute final domain status using the complete answer set
  const now = sortedEvents.length > 0
    ? dateFromWeekOffset(dob, sortedEvents[sortedEvents.length - 1].weekOffset)
    : new Date();

  const allAnsweredQids = new Set(accumulatedAnswers.map((a) => a.questionId));
  // Also include universal red flags if they haven't been answered
  const allQuestionsToScore = [
    ...Array.from(allAnsweredQids)
      .map((id) => getQuestionById(id))
      .filter((q): q is NonNullable<typeof q> => q !== null && q !== undefined),
  ];

  const finalResults = allQuestionsToScore.map((q) =>
    evaluateQuestion(q, child, accumulatedAnswers, ruleset, now),
  );

  const finalDomainStatus = scoreAllDomains(finalResults, accumulatedAnswers);

  return {
    trajectoryId: trajectory.id,
    trajectoryName: trajectory.name,
    timeline,
    finalDomainStatus,
  };
}

/**
 * Compare two timeline sequences and generate AlertDiff entries for questions
 * where the severity differs between the two rulesets.
 */
function computeDiffs(
  trajectoryId: string,
  baselineTimeline: TimelineEvent[],
  newTimeline: TimelineEvent[],
): AlertDiff[] {
  const diffs: AlertDiff[] = [];

  // Build map of questionId+weekOffset -> severity for baseline
  const baselineMap = new Map<string, Severity>();
  for (const event of baselineTimeline) {
    baselineMap.set(`${event.questionId}::${event.weekOffset}`, event.severity);
  }

  for (const event of newTimeline) {
    const key = `${event.questionId}::${event.weekOffset}`;
    const baselineSeverity = baselineMap.get(key);

    if (baselineSeverity === undefined) continue;

    if (SEVERITY_ORDER[event.severity] !== SEVERITY_ORDER[baselineSeverity]) {
      const escalated =
        SEVERITY_ORDER[event.severity] > SEVERITY_ORDER[baselineSeverity];
      diffs.push({
        trajectoryId,
        questionId: event.questionId,
        weekOffset: event.weekOffset,
        baselineSeverity,
        newSeverity: event.severity,
        reason: escalated
          ? `Severity escalated from "${baselineSeverity}" to "${event.severity}" under the new ruleset.`
          : `Severity de-escalated from "${baselineSeverity}" to "${event.severity}" under the new ruleset.`,
      });
    }
  }

  return diffs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Simulate one or more developmental trajectories through the engine.
 *
 * @param ruleset           The ruleset to use for evaluation.
 * @param trajectories      Array of trajectories to simulate.
 * @param baselineRuleset   Optional baseline ruleset. When provided, the same
 *                          trajectories are run with the baseline and AlertDiffs
 *                          are generated for any severity changes.
 */
export function simulate(
  ruleset: Ruleset = DEFAULT_RULESET,
  trajectories: Trajectory[],
  baselineRuleset?: Ruleset,
): SimulationResult {
  const trajectoryResults: TrajectoryResult[] = trajectories.map((traj) =>
    runTrajectory(traj, ruleset),
  );

  let diffs: AlertDiff[] = [];

  if (baselineRuleset) {
    const baselineResults: TrajectoryResult[] = trajectories.map((traj) =>
      runTrajectory(traj, baselineRuleset),
    );

    for (let i = 0; i < trajectories.length; i++) {
      const baseline = baselineResults[i];
      const current = trajectoryResults[i];
      if (!baseline || !current) continue;

      const trajectoryDiffs = computeDiffs(
        trajectories[i].id,
        baseline.timeline,
        current.timeline,
      );
      diffs = diffs.concat(trajectoryDiffs);
    }
  }

  return {
    trajectories: trajectoryResults,
    diffs,
  };
}
