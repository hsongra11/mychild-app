# MyChild Engine — Recommended Changes from Autoresearch

**Generated:** 2026-03-29
**Based on:** 90 threshold experiments, 707 adversarial profiles, 168 edge-case surprises

---

## Priority 1: Critical

### 1. Audit and strengthen regression detection

- **Description:** Adversarial regression profiles (previously achieved milestones regressing to "not yet") had a 98.1% surprise rate — the engine classified nearly all of them as less concerning than expected. The regression detection logic may not be triggering consistently.
- **Clinical basis:** Developmental regression (loss of previously acquired skills) is a well-established red flag for autism spectrum disorder, Rett syndrome, and neurological conditions. CDC and AAP guidelines emphasize that any loss of skills warrants immediate evaluation.
- **Expected metric impact:** Improved sensitivity for regression scenarios (currently not captured in baseline metrics since no regression profiles exist in the 108-profile set).
- **Implementation difficulty:** M — requires review of regression detection in `rules-engine.ts` and potentially new logic for domain-level regression escalation in `domain-scoring.ts`.
- **Already applied by Agent 3:** No (Agent 3 did not produce results)

---

## Priority 2: High

### 2. ~~Sweep hardcoded thresholds in domain-scoring.ts~~ PARTIALLY ADDRESSED

- **Description:** The actual classification decisions are driven by hardcoded thresholds in `domain-scoring.ts`. Agent 3 addressed the `flagCount >= 1` threshold by adding an isolated-delay downgrade and cross-domain correction, eliminating all 4 false positives.
- **Remaining work:** The `warningCount >= 2` moderate_concern threshold and `answeredCount < 2` sufficiency gate were not swept systematically. Future research should test these.
- **Already applied by Agent 3:** Partially (commit `d0f6813`, `fd20b1f`)

### 3. ~~Refine sufficiency gate bypass logic~~ ADDRESSED VIA DIFFERENT APPROACH

- **Description:** Agent 3 tried raising the gate from 2 to 3 (discarded — sensitivity dropped to 85.7%). Instead, the isolated-delay downgrade and cross-domain correction achieve the same goal: preventing single-flag overescalation without raising the gate itself.
- **Already applied by Agent 3:** Yes (via alternative approach — commits `d0f6813`, `fd20b1f`)

### 4. Add developmental sequence validation

- **Description:** The engine evaluates each question independently. It doesn't detect when a child achieves a harder, later milestone but fails an easier, earlier one in the same domain. This is clinically unusual and should trigger at least a `watch` status.
- **Clinical basis:** Developmental milestones follow a predictable sequence (e.g., sitting before walking, babbling before words). Violations of this sequence suggest atypical development or reporting errors.
- **Expected metric impact:** Would catch contradictory-answer edge cases (4 surprises from adversarial testing).
- **Implementation difficulty:** M — new logic needed, likely in `domain-scoring.ts`, to compare severity across questions ordered by normativeAgeMonths.
- **Already applied by Agent 3:** No

---

## Priority 3: Medium

### 5. Integrate totalWeightedPoints into domain status logic

- **Description:** The `weightValues` configuration in `defaults.ts` computes `totalWeightedPoints` in the domain vector, but this value is never used in the status determination logic. Either integrate it (making weight configuration meaningful) or document it as reserved.
- **Clinical basis:** Question weights (L/M/H/RF) are assigned based on clinical importance. Using them in scoring would better reflect clinical priority of different milestones.
- **Expected metric impact:** Would make the weight configuration actually affect classification, enabling finer-grained threshold tuning.
- **Implementation difficulty:** M — requires redesigning the status determination in `domain-scoring.ts` to use weighted points instead of or in addition to flag/warning/precaution counts.
- **Already applied by Agent 3:** No

### 6. Add preterm profiles to baseline validation set

- **Description:** None of the 108 baseline profiles include `gestationalWeeks`, so the corrected age logic is completely untested. Agent 1 confirmed that `correctedAgeCutoffMonths` changes had zero effect.
- **Clinical basis:** Preterm infants represent ~10% of births and have well-documented developmental catch-up patterns. The corrected age adjustment is critical for fair assessment.
- **Expected metric impact:** No change to current metrics, but would validate an untested code path.
- **Implementation difficulty:** S — adding profiles to `synthetic-profiles.json`.
- **Already applied by Agent 3:** No

### 7. Add global-level validation

- **Description:** The T_yellow, T_orange, and T_red thresholds control the global status (green/yellow/orange/red) but the validation pipeline only tests at the domain level. These thresholds are untestable without global-level assertions.
- **Clinical basis:** The global status drives the overall screening recommendation (routine follow-up vs. immediate referral). It should be validated.
- **Expected metric impact:** No change to domain metrics, but would validate a separate classification layer.
- **Implementation difficulty:** M — requires adding global-level ground truth to synthetic profiles and extending the validation pipeline.
- **Already applied by Agent 3:** No

### 8. Expand baseline profile set with more borderline cases

- **Description:** The current 108 profiles are dominated by clear-cut scenarios. Most concern profiles have multiple missed milestones well beyond any grace window; most typical profiles have all achieved. There are few profiles right at decision boundaries, which is why threshold sweeps produce no metric variation.
- **Clinical basis:** Real-world developmental screening encounters many borderline cases. The profile set should represent this.
- **Expected metric impact:** Would make threshold sweeps meaningful and provide better coverage of the engine's decision boundaries.
- **Implementation difficulty:** M — requires carefully designing profiles with verified ground truth at threshold boundaries.
- **Already applied by Agent 3:** No
