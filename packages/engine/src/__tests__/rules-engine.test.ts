import { describe, it, expect } from 'vitest';
import { evaluateQuestion } from '../rules-engine.js';
import { getQuestionById } from '../question-bank.js';
import { DEFAULT_RULESET } from '../defaults.js';
import type { Child, AnswerEvent } from '../types.js';

function makeChild(ageMonths: number): { child: Child; now: Date } {
  const now = new Date('2026-01-15');
  const dob = new Date(now.getTime() - ageMonths * 30.44 * 24 * 60 * 60 * 1000);
  return { child: { dob }, now };
}

function makeAnswer(
  questionId: string,
  answer: 'achieved' | 'not_yet' | 'unsure' | 'skipped',
  daysAgo: number = 0,
): AnswerEvent {
  const now = new Date('2026-01-15');
  return {
    questionId,
    answer,
    timestamp: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
  };
}

describe('evaluateQuestion', () => {
  it('returns normal for achieved milestone', () => {
    const q = getQuestionById('q_0_2m_05')!;
    const { child, now } = makeChild(4);
    const answers = [makeAnswer('q_0_2m_05', 'achieved')];

    const result = evaluateQuestion(q, child, answers, DEFAULT_RULESET, now);
    expect(result.severity).toBe('normal');
  });

  it('returns reminder for unanswered question', () => {
    const q = getQuestionById('q_0_2m_05')!;
    const { child, now } = makeChild(4);

    const result = evaluateQuestion(q, child, [], DEFAULT_RULESET, now);
    expect(result.severity).toBe('reminder');
  });

  it('returns watch for unsure answer', () => {
    const q = getQuestionById('q_0_2m_05')!;
    const { child, now } = makeChild(4);
    const answers = [makeAnswer('q_0_2m_05', 'unsure')];

    const result = evaluateQuestion(q, child, answers, DEFAULT_RULESET, now);
    expect(result.severity).toBe('watch');
  });

  it('returns precaution when just past normative but within grace window', () => {
    // q_0_2m_09 has normativeAge=2m, weight=H (standard grace = 4 weeks for infant)
    // At 2.5 months, child is 0.5 months past normative, within 4-week (~0.92 month) grace
    const q = getQuestionById('q_0_2m_09')!;
    const { child, now } = makeChild(2.5);
    const answers = [makeAnswer('q_0_2m_09', 'not_yet')];

    const result = evaluateQuestion(q, child, answers, DEFAULT_RULESET, now);
    expect(result.severity).toBe('precaution');
  });

  it('returns flag for red flag question answered not_yet', () => {
    const q = getQuestionById('rf_01')!;
    const { child, now } = makeChild(12);
    const answers = [makeAnswer('rf_01', 'not_yet')];

    const result = evaluateQuestion(q, child, answers, DEFAULT_RULESET, now);
    expect(result.severity).toBe('flag');
  });

  it('adjusts grace window for low-weight questions', () => {
    // Low-weight questions get +4 weeks extra grace
    const q = getQuestionById('q_0_2m_03')!; // W=L
    expect(q.weight).toBe('L');

    // normativeAge=2m, L weight grace = 4 + 4 = 8 weeks = ~1.84 months
    // At 3 months, child is 1 month past normative, within 8-week grace → precaution
    const { child, now } = makeChild(3);
    const answers = [makeAnswer('q_0_2m_03', 'not_yet')];

    const result = evaluateQuestion(q, child, answers, DEFAULT_RULESET, now);
    expect(result.severity).toBe('precaution');
  });

  it('returns reminder when child is younger than normative age', () => {
    // q_9_11m_06 has normativeAge=9m
    const q = getQuestionById('q_9_11m_06')!;
    const { child, now } = makeChild(6); // younger than normative
    const answers = [makeAnswer('q_9_11m_06', 'not_yet')];

    const result = evaluateQuestion(q, child, answers, DEFAULT_RULESET, now);
    expect(result.severity).toBe('reminder');
  });
});
