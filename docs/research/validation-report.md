# MyChild Engine — Internal Consistency Verification Report

**Generated:** 2026-03-28T15:15:36.957Z
**Engine version:** 0.2.0
**Profiles evaluated:** 108

> Internal Consistency Verification — this study measures whether the engine produces expected outputs for hand-labeled synthetic developmental profiles. It does NOT measure clinical sensitivity/specificity against a gold standard.

## Abstention Analysis

When the engine has insufficient evidence for a domain (fewer than 2 answered
questions), it returns `insufficient_evidence` rather than a classification.
These abstentions are counted as negatives in the metrics above but reported
separately here for transparency.

```
Total abstentions:                  45
  Correctly negative (ground truth): 45
  Incorrectly negative (missed):     0
  % of total observations:           15.3%
```

**Note:** A high abstention rate means the engine is correctly declining to
classify when it lacks data, but it also means the reported specificity
includes cases where the engine abstained rather than actively ruled out concern.

## Global Consistency Metrics

```
Hit rate (concern profiles correctly flagged):  100.0% (96.5% - 100.0%)
Correct clear (typical profiles correctly cleared):  97.9% (94.7% - 99.2%)
Flag precision (flags that matched expected concern):  96.3% (90.9% - 98.6%)
Clear precision (clears that matched expected no-concern):  100.0% (98.0% - 100.0%)
Overall agreement:  98.6%
Cohen's κ (agreement beyond chance):  0.971 (0.942 - 0.999)
N:  294
```

## Per-Domain Consistency Metrics

### Gross Motor

```
Confusion Matrix: TP=25 FP=0 TN=47 FN=0
Hit rate (concern profiles correctly flagged):  100.0% (86.7% - 100.0%)
Correct clear (typical profiles correctly cleared):  100.0% (92.4% - 100.0%)
Flag precision (flags that matched expected concern):  100.0% (86.7% - 100.0%)
Clear precision (clears that matched expected no-concern):  100.0% (92.4% - 100.0%)
Overall agreement:  100.0%
Cohen's κ (agreement beyond chance):  1.000 (1.000 - 1.000)
N:  72
```

### Fine Motor

```
Confusion Matrix: TP=4 FP=1 TN=12 FN=0
Hit rate (concern profiles correctly flagged):  100.0% (51.0% - 100.0%)
Correct clear (typical profiles correctly cleared):  92.3% (66.7% - 98.6%)
Flag precision (flags that matched expected concern):  80.0% (37.6% - 96.4%)
Clear precision (clears that matched expected no-concern):  100.0% (75.7% - 100.0%)
Overall agreement:  94.1%
Cohen's κ (agreement beyond chance):  0.850 (0.563 - 1.000)
N:  17
```

### Receptive Language

```
Confusion Matrix: TP=12 FP=1 TN=21 FN=0
Hit rate (concern profiles correctly flagged):  100.0% (75.7% - 100.0%)
Correct clear (typical profiles correctly cleared):  95.5% (78.2% - 99.2%)
Flag precision (flags that matched expected concern):  92.3% (66.7% - 98.6%)
Clear precision (clears that matched expected no-concern):  100.0% (84.5% - 100.0%)
Overall agreement:  97.1%
Cohen's κ (agreement beyond chance):  0.937 (0.815 - 1.000)
N:  34
```

### Expressive Language

```
Confusion Matrix: TP=25 FP=1 TN=41 FN=0
Hit rate (concern profiles correctly flagged):  100.0% (86.7% - 100.0%)
Correct clear (typical profiles correctly cleared):  97.6% (87.7% - 99.6%)
Flag precision (flags that matched expected concern):  96.2% (81.1% - 99.3%)
Clear precision (clears that matched expected no-concern):  100.0% (91.4% - 100.0%)
Overall agreement:  98.5%
Cohen's κ (agreement beyond chance):  0.968 (0.907 - 1.000)
N:  67
```

### Social-Emotional

```
Confusion Matrix: TP=14 FP=1 TN=30 FN=0
Hit rate (concern profiles correctly flagged):  100.0% (78.5% - 100.0%)
Correct clear (typical profiles correctly cleared):  96.8% (83.8% - 99.4%)
Flag precision (flags that matched expected concern):  93.3% (70.2% - 98.8%)
Clear precision (clears that matched expected no-concern):  100.0% (88.6% - 100.0%)
Overall agreement:  97.8%
Cohen's κ (agreement beyond chance):  0.949 (0.851 - 1.000)
N:  45
```

### Cognitive / Play

```
Confusion Matrix: TP=10 FP=0 TN=12 FN=0
Hit rate (concern profiles correctly flagged):  100.0% (72.2% - 100.0%)
Correct clear (typical profiles correctly cleared):  100.0% (75.7% - 100.0%)
Flag precision (flags that matched expected concern):  100.0% (72.2% - 100.0%)
Clear precision (clears that matched expected no-concern):  100.0% (75.7% - 100.0%)
Overall agreement:  100.0%
Cohen's κ (agreement beyond chance):  1.000 (1.000 - 1.000)
N:  22
```

### Self-Help / Adaptive

```
Confusion Matrix: TP=6 FP=0 TN=8 FN=0
Hit rate (concern profiles correctly flagged):  100.0% (61.0% - 100.0%)
Correct clear (typical profiles correctly cleared):  100.0% (67.6% - 100.0%)
Flag precision (flags that matched expected concern):  100.0% (61.0% - 100.0%)
Clear precision (clears that matched expected no-concern):  100.0% (67.6% - 100.0%)
Overall agreement:  100.0%
Cohen's κ (agreement beyond chance):  1.000 (1.000 - 1.000)
N:  14
```

### Vision / Hearing

```
Confusion Matrix: TP=9 FP=0 TN=14 FN=0
Hit rate (concern profiles correctly flagged):  100.0% (70.1% - 100.0%)
Correct clear (typical profiles correctly cleared):  100.0% (78.5% - 100.0%)
Flag precision (flags that matched expected concern):  100.0% (70.1% - 100.0%)
Clear precision (clears that matched expected no-concern):  100.0% (78.5% - 100.0%)
Overall agreement:  100.0%
Cohen's κ (agreement beyond chance):  1.000 (1.000 - 1.000)
N:  23
```

## Threshold Calibration Disagreements

These cases show where the engine's classification differs from the hand-written
clinical expectation. Each disagreement represents a threshold calibration question
that should be reviewed with clinical input.

| Profile | Domain | Engine says | Expected | Engine status | Notes |
|---------|--------|-------------|----------|---------------|-------|
| Borderline: single EL miss at 12 months | EL | concern | no_concern | high_concern | One language milestone not_yet among several achieved — clinically would be "monitor" |
| Borderline: sparse SE data at 15 months | SE | concern | no_concern | high_concern | Only 2 SE questions answered, one not_yet — clinically insufficient to flag concern |
| Borderline: near-threshold FM at 18 months | FM | concern | no_concern | high_concern | One not_yet + one unsure among achieved — clinically would be "monitor" |
| Borderline: single RL observation at 12 months | RL | concern | no_concern | high_concern | Only 1 RL question answered (not_yet) — clinically insufficient data to flag |

**4 disagreement(s)** found. These are not bugs — they are
threshold decisions where the engine is more aggressive than clinical consensus.
Reviewing these with a clinician would help calibrate the engine's sensitivity
vs. specificity tradeoff.

## Methodology

> **This is internal consistency verification, NOT clinical validation.**
> These metrics measure whether the engine produces expected outputs for
> hand-labeled synthetic profiles. They do NOT measure sensitivity/specificity
> against a clinical gold standard or real patient data.

Ground truth labels are hand-written by profile designers based on the
developmental scenario each profile represents (e.g., "all milestones
not_yet in EL domain" → EL: concern). The engine's output is then compared
against these hand-written labels.

**Evaluation path:** Each profile is evaluated through the full public engine
pipeline, including regression detection (achieved→not_yet pattern escalation).

**Binary threshold:** Domain status ∈ {high_concern, moderate_concern} = positive (concern).
All other domain statuses (normal, watch, low_concern, insufficient_evidence) = negative.

**Abstention handling:** When the engine returns `insufficient_evidence` for a domain,
it is counted as a negative classification but reported separately in the Abstention
Analysis section. This ensures transparency about the engine declining to classify
versus actively ruling out concern.

**Confidence intervals:** Wilson score method for proportions, normal approximation for kappa.

**Limitations:**
- N represents domain-profile pairs, not independent children.
- Prevalence is designer-controlled, so predictive values reflect the synthetic mix, not real-world prevalence.
- Cohen's kappa measures agreement with hand-written expectations, not an independent clinical gold standard.
- Profiles only cover domains explicitly labeled — unlabeled domains are excluded from metrics.
- Most profiles test clear-cut scenarios; borderline profiles test decision boundaries but are a small subset.
