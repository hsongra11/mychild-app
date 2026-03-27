// Client-safe constants — duplicated here so they never trigger an engine import
// on the client bundle. The engine uses fs.readFileSync and cannot run in the browser.

export const DISCLAIMER =
  'This app tracks development and helps you notice changes early. ' +
  "It cannot diagnose. If you are worried, please talk to your child's doctor."

export const DEFAULT_THRESHOLDS = {
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
} as const
