'use server'

import {
  evaluate,
  computeChildAge,
  getDueQuestions,
  simulate,
  DEFAULT_RULESET,
} from 'mychild-engine'
import type {
  AnswerEvent,
  Ruleset,
  ScreeningResult,
  AgeResult,
  Question,
  SimulationResult,
  Trajectory,
} from 'mychild-engine'

// ---------------------------------------------------------------------------
// Serialisable wire types
// (Dates cannot cross the server→client boundary — use ISO strings instead)
// ---------------------------------------------------------------------------

export interface SerializedAnswerEvent {
  questionId: string
  answer: 'achieved' | 'not_yet' | 'unsure' | 'skipped'
  timestamp: string // ISO string
  probeResponses?: Record<string, string>
  note?: string
}

export interface SerializedChild {
  dob: string // ISO string
  gestationalWeeks?: number
}

function deserializeAnswers(events: SerializedAnswerEvent[]): AnswerEvent[] {
  return events.map((e) => ({
    ...e,
    timestamp: new Date(e.timestamp),
  }))
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

export async function serverComputeAge(
  dobIso: string,
  gestationalWeeks?: number,
  nowIso?: string,
): Promise<AgeResult> {
  const dob = new Date(dobIso)
  const now = nowIso ? new Date(nowIso) : new Date()
  return computeChildAge(dob, gestationalWeeks, now)
}

export async function serverGetDueQuestions(
  child: SerializedChild,
  answers: SerializedAnswerEvent[],
  ruleset?: Ruleset,
  nowIso?: string,
): Promise<Question[]> {
  const dob = new Date(child.dob)
  const now = nowIso ? new Date(nowIso) : new Date()
  return getDueQuestions(
    { dob, gestationalWeeks: child.gestationalWeeks },
    deserializeAnswers(answers),
    ruleset ?? DEFAULT_RULESET,
    now,
  )
}

export async function serverEvaluate(
  child: SerializedChild,
  answers: SerializedAnswerEvent[],
  ruleset?: Ruleset,
  nowIso?: string,
): Promise<ScreeningResult> {
  const dob = new Date(child.dob)
  const now = nowIso ? new Date(nowIso) : new Date()
  // ScreeningResult contains Date in nextCheckDate — convert to plain objects
  const result = evaluate(
    { dob, gestationalWeeks: child.gestationalWeeks },
    deserializeAnswers(answers),
    ruleset ?? DEFAULT_RULESET,
    now,
  )
  // Serialize any Date objects in nested structures so they can cross the boundary
  return JSON.parse(JSON.stringify(result)) as ScreeningResult
}

export async function serverSimulate(
  trajectories: Trajectory[],
  ruleset?: Ruleset,
  baselineRuleset?: Ruleset,
): Promise<SimulationResult> {
  const result = simulate(
    ruleset ?? DEFAULT_RULESET,
    trajectories,
    baselineRuleset,
  )
  return JSON.parse(JSON.stringify(result)) as SimulationResult
}
