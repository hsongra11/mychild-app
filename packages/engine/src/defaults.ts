import type { Ruleset } from './types.js';

export const DEFAULT_RULESET: Ruleset = {
  version: '0.1.0',
  thresholds: { T_yellow: 2, T_orange: 4, T_red: 6 },
  graceWeeks: { infant: 4, toddler: 6 },
  deltaNotYetWeeks: { infant: 2, toddler: 4 },
  deltaUnsureWeeks: 2,
  deltaRepeatWeeks: 4,
  nRepeat: 2,
  correctedAgeCutoffMonths: 24,
  weightValues: {
    L: { positive: 0.5, negative: 0.5 },
    M: { positive: 1.0, negative: 1.0 },
    H: { positive: 1.5, negative: 1.5 },
    RF: { positive: 2.0, negative: 2.0 },
  },
};
