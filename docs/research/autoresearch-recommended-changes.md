# MyChild Engine — Recommended Changes from Autoresearch (Run 4)

**Generated:** 2026-03-29
**Based on:** 325 threshold experiments, 70,192 adversarial profiles, 1,747 curated profiles, 14 engine improvements across runs 1–3, 0 new engine changes in run 4

---

## Already Applied (Runs 1–3)

### Run 1 (4 improvements)

1. ✅ **d0f6813** — Isolated single-flag downgrade
2. ✅ **fd20b1f** — Cross-domain correction for sparse high_concern
3. ✅ **1912269** — Regression detection bypasses evidence gate
4. ✅ **5fb5c03** — Cross-domain regression protection

### Run 2 (4 improvements)

5. ✅ **3bf4173** — Soft regression detection (achieved→unsure)
6. ✅ **0ca3f68** — Multi-regression escalation to high_concern
7. ✅ **abc3eec** — Pervasive caregiver uncertainty detection
8. ✅ **2813216** — Developmental sequence anomaly detection

### Run 2 continued (6 improvements)

9. ✅ **4d51efa** — RF domain scoring
10. ✅ **d799444** — Ground truth label normalization
11. ✅ **58e32d4** — Evidence gate + flag threshold tuning
12. ✅ **79d862d** — low_concern in binary classification
13. ✅ **9059f9f** — Asymmetric screening thresholds
14. ✅ **1e7d918** — Sparse precaution downgrade

### Run 3 refinements (iterating on above, not new improvements)

- a5cac7e, d11a0fe, 1c3ef09, f3a8b53, c5a605f, 34f22dd, a3fff33, 6048150

### Run 4

No engine changes. Run 4 focused on relabeling and curated set expansion. 325 threshold experiments were conducted; no configuration produced a net improvement over current defaults, confirming that the existing thresholds are locally optimal.

---

## Priority 1: Critical

### Clinical validation study

- **Description:** All performance metrics are derived from synthetic profiles. The engine has never been evaluated against real patient data.
- **Why now:** κ=1.000 on the curated set and κ=0.852 on adversarial profiles establish strong internal consistency, but synthetic agreement does not imply clinical validity. Regulatory and clinical adoption require real-world evidence.
- **Path:** Retrospective comparison against validated instruments (ASQ-3, M-CHAT) → concurrent validity study with clinician-assigned labels → prospective cohort study.
- **Difficulty:** Large — requires IRB approval, clinical partnership, and data governance.

### Triage 315 critical adversarial findings

- **Description:** Run 4 produced 315 findings classified as critical severity across the adversarial test suite (out of 70,192 profiles tested). These represent cases where the engine's output materially diverges from the expected label on clinically significant profiles.
- **Action:** Manually review each critical finding. Categorize by root cause (threshold boundary, missing logic, label disagreement, data artifact). Determine which represent true engine defects vs. acceptable disagreement.
- **Difficulty:** Medium — labor-intensive but well-scoped.

---

## Priority 2: High

### Investigate sensitivity gap

- **Description:** Adversarial sensitivity is 86.5% against a specificity of 98.0%. The 13.5% false-negative rate on adversarial profiles is the primary remaining performance gap.
- **Action:** Produce a per-category and per-domain breakdown of false negatives. The adversarial suite spans 18 categories (see counts below); identifying which drive the most FNs will focus algorithmic work.

| Category | Profile count |
|---|---|
| regression | 10,578 |
| sparse | 9,072 |
| single_domain | 8,786 |
| mutation | 6,500 |
| exhaustive_age | 5,616 |
| contradictory | 5,208 |
| clear_delay | 5,073 |
| clear_typical | 4,964 |
| preterm | 4,752 |
| borderline | 2,897 |
| combinatorial | 2,544 |
| real_world | 1,914 |
| weight_stress | 1,511 |
| typical | 334 |
| mixed_regression | 308 |
| motor_delay | 53 |
| speech_delay | 53 |
| global_delay | 29 |

- **Hypothesis:** Sparse and contradictory categories are likely overrepresented in FNs given known engine conservatism in low-evidence scenarios.
- **Difficulty:** Medium — requires instrumented test run with per-profile classification metadata.

### Expand the curated set

- **Description:** The curated set currently contains 1,747 profiles with 12,991 observations and achieves κ=1.000. Expanding it will narrow confidence intervals on per-domain metrics and increase coverage of edge-case patterns.
- **Focus areas:** Promote high-confidence adversarial profiles from the 758 edge-case findings. Prioritize domains and age ranges with the fewest curated examples. Ensure representation of regression, preterm, and combinatorial profiles.
- **Difficulty:** Medium — requires manual ground-truth verification for each promoted profile.

### Per-domain confusion matrix analysis

- **Description:** Global κ and sensitivity/specificity mask domain-level variation. Some domains may perform significantly worse than the aggregate figures suggest.
- **Action:** Compute per-domain TP/FP/TN/FN rates across both the adversarial and curated suites. Identify domains where sensitivity or specificity is below acceptable thresholds.
- **Difficulty:** Small — analysis work, no engine changes required.

---

## Priority 3: Medium

### Structural engine improvements

- **Description:** Threshold tuning is exhausted — 325 experiments across run 4 found no positive moves. Further performance gains require algorithmic changes, not parameter adjustments.
- **Candidates:**
  - Improved handling of profiles where evidence is sparse but the available signals are strongly concerning.
  - Better modeling of contradictory data (e.g., high-weight flag present alongside strong normal evidence in the same domain).
  - Cross-domain interaction effects: cases where no single domain triggers concern but the combination of multiple borderline domains should.
- **Difficulty:** Large — requires hypothesis formation, implementation, and full adversarial re-evaluation for each candidate change.

### Better handling of sparse and contradictory data

- **Description:** The sparse (9,072) and contradictory (5,208) categories together represent ~20% of the adversarial suite and are likely disproportionately represented in false negatives. Current logic applies a uniform evidence gate regardless of the clinical weight of available signals.
- **Difficulty:** Medium.

### Cross-domain interaction effects

- **Description:** The engine scores domains independently and then applies global thresholds. Cases where multiple domains each fall just below the concern threshold may warrant a combined-signal escalation path.
- **Difficulty:** Medium.

---

## Priority 4: Future

### Retrospective comparison against ASQ-3/M-CHAT datasets

- **Description:** Establish external validity by comparing engine outputs to scores from the Ages & Stages Questionnaires (ASQ-3) and Modified Checklist for Autism in Toddlers (M-CHAT) on the same populations.

### Concurrent validity study

- **Description:** Administer the MyChild questionnaire alongside a validated screener to the same cohort and compute agreement metrics.

### Prospective cohort study

- **Description:** Follow a birth cohort longitudinally. Compare engine flags at early ages against developmental diagnoses at ages 3–5.

### Multi-language support

- **Description:** Clinical validation is English-only. Expanding to other languages requires both translation of questionnaire content and validation that performance metrics hold across languages and cultural contexts.
