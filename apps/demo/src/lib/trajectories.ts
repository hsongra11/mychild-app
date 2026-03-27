import type { Trajectory } from '@mychild/engine'

export const BUILT_IN_TRAJECTORIES: Trajectory[] = [
  {
    id: 'normal',
    name: 'Normal Development',
    description:
      'A child who achieves all milestones on schedule. Expect all domains to remain green.',
    child: { dob: '2025-06-01' },
    events: [
      { weekOffset: 8, questionId: 'q_0_2m_05', answer: 'achieved' },
      { weekOffset: 8, questionId: 'q_0_2m_09', answer: 'achieved' },
      { weekOffset: 16, questionId: 'q_3_5m_04', answer: 'achieved' },
      { weekOffset: 16, questionId: 'q_3_5m_12', answer: 'achieved' },
      { weekOffset: 28, questionId: 'q_6_8m_10', answer: 'achieved' },
      { weekOffset: 28, questionId: 'q_6_8m_08', answer: 'achieved' },
    ],
  },
  {
    id: 'speech_delay',
    name: 'Speech Delay Pattern',
    description:
      'Motor milestones on track, but language markers consistently not yet achieved. Watch for escalation in EL/RL domains.',
    child: { dob: '2025-03-01' },
    events: [
      { weekOffset: 8, questionId: 'q_0_2m_05', answer: 'not_yet' },
      { weekOffset: 8, questionId: 'q_0_2m_09', answer: 'achieved' },
      { weekOffset: 16, questionId: 'q_3_5m_04', answer: 'not_yet' },
      { weekOffset: 16, questionId: 'q_3_5m_12', answer: 'achieved' },
      { weekOffset: 28, questionId: 'q_6_8m_04', answer: 'not_yet' },
      { weekOffset: 28, questionId: 'q_6_8m_06', answer: 'not_yet' },
      { weekOffset: 44, questionId: 'q_9_11m_06', answer: 'not_yet' },
    ],
  },
  {
    id: 'motor_regression',
    name: 'Motor Concern with Regression',
    description:
      'Multiple gross motor milestones missed, plus a regression flag. Expect high-concern status in GM domain.',
    child: { dob: '2025-01-01' },
    events: [
      { weekOffset: 16, questionId: 'q_3_5m_12', answer: 'not_yet' },
      { weekOffset: 16, questionId: 'q_3_5m_13', answer: 'achieved' },
      { weekOffset: 28, questionId: 'q_6_8m_10', answer: 'not_yet' },
      { weekOffset: 28, questionId: 'q_6_8m_11', answer: 'not_yet' },
      { weekOffset: 44, questionId: 'q_9_11m_10', answer: 'not_yet' },
      { weekOffset: 44, questionId: 'rf_01', answer: 'not_yet' },
    ],
  },
]
