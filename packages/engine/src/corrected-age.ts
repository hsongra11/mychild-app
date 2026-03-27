import type { AgeResult } from './types.js';

const DAYS_PER_MONTH = 30.4375; // average days per month (365.25 / 12)
const DAYS_PER_WEEK = 7;
const FULL_TERM_WEEKS = 40;

/**
 * Compute chronological and corrected (adjusted) age for a child.
 *
 * - weeksEarly = max(0, 40 - gestationalWeeks)
 * - correctedAge = chronologicalAge - weeksEarly (in time)
 * - Corrected age is used until 24 months chronological, then we switch to
 *   chronological age for all comparisons.
 *
 * @param dob   Date of birth
 * @param gestationalWeeks  Gestational age at birth in weeks. Omit or pass
 *                          undefined for full-term (40 weeks).
 * @param now   Reference date (defaults to today). Useful for testing.
 */
export function computeAge(
  dob: Date,
  gestationalWeeks?: number,
  now: Date = new Date(),
): AgeResult {
  const chronologicalMs = now.getTime() - dob.getTime();
  const chronologicalDays = Math.max(0, Math.floor(chronologicalMs / (1000 * 60 * 60 * 24)));
  const chronologicalWeeks = Math.floor(chronologicalDays / DAYS_PER_WEEK);
  const chronologicalMonths = chronologicalDays / DAYS_PER_MONTH;

  const gestWeeks = gestationalWeeks ?? FULL_TERM_WEEKS;
  const weeksEarly = Math.max(0, FULL_TERM_WEEKS - gestWeeks);
  const isPreterm = weeksEarly > 0;

  const correctedDays = Math.max(0, chronologicalDays - weeksEarly * DAYS_PER_WEEK);
  const correctedWeeks = Math.floor(correctedDays / DAYS_PER_WEEK);
  const correctedMonths = correctedDays / DAYS_PER_MONTH;

  // Stop using corrected age once the child reaches 24 months chronologically
  const useCorrectedAge = isPreterm && chronologicalMonths < 24;

  return {
    chronologicalDays,
    chronologicalMonths,
    chronologicalWeeks,
    correctedDays,
    correctedMonths,
    correctedWeeks,
    weeksEarly,
    isPreterm,
    useCorrectedAge,
  };
}
