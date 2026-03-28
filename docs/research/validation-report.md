# MyChild Engine — Synthetic Scenario Verification Report

**Generated:** 2026-03-28T13:36:04.631Z
**Engine version:** 0.2.0
**Profiles evaluated:** 100

> Synthetic Scenario Verification — this study measures whether the engine produces expected outputs for known developmental trajectories. It does NOT measure sensitivity/specificity against a clinical gold standard.

## Abstention Analysis

When the engine has insufficient evidence for a domain (fewer than 2 answered
questions), it returns `insufficient_evidence` rather than a classification.
These abstentions are counted as negatives in the metrics above but reported
separately here for transparency.

```
Total abstentions:                  478
  Correctly negative (ground truth): 478
  Incorrectly negative (missed):     0
  % of total observations:           59.8%
```

**Note:** A high abstention rate means the engine is correctly declining to
classify when it lacks data, but it also means the reported specificity
includes cases where the engine abstained rather than actively ruled out concern.

## Global Metrics

```
Sensitivity:  100.0% (97.8% - 100.0%)
Specificity:  100.0% (99.4% - 100.0%)
PPV:          100.0% (97.8% - 100.0%)
NPV:          100.0% (99.4% - 100.0%)
Accuracy:     100.0%
Cohen's κ:    1.000 (1.000 - 1.000)
N:            800
```

## Per-Domain Metrics

### Gross Motor

```
Confusion Matrix: TP=24 FP=0 TN=76 FN=0
Sensitivity:  100.0% (86.2% - 100.0%)
Specificity:  100.0% (95.2% - 100.0%)
PPV:          100.0% (86.2% - 100.0%)
NPV:          100.0% (95.2% - 100.0%)
Accuracy:     100.0%
Cohen's κ:    1.000 (1.000 - 1.000)
N:            100
```

### Fine Motor

```
Confusion Matrix: TP=14 FP=0 TN=86 FN=0
Sensitivity:  100.0% (78.5% - 100.0%)
Specificity:  100.0% (95.7% - 100.0%)
PPV:          100.0% (78.5% - 100.0%)
NPV:          100.0% (95.7% - 100.0%)
Accuracy:     100.0%
Cohen's κ:    1.000 (1.000 - 1.000)
N:            100
```

### Receptive Language

```
Confusion Matrix: TP=18 FP=0 TN=82 FN=0
Sensitivity:  100.0% (82.4% - 100.0%)
Specificity:  100.0% (95.5% - 100.0%)
PPV:          100.0% (82.4% - 100.0%)
NPV:          100.0% (95.5% - 100.0%)
Accuracy:     100.0%
Cohen's κ:    1.000 (1.000 - 1.000)
N:            100
```

### Expressive Language

```
Confusion Matrix: TP=29 FP=0 TN=71 FN=0
Sensitivity:  100.0% (88.3% - 100.0%)
Specificity:  100.0% (94.9% - 100.0%)
PPV:          100.0% (88.3% - 100.0%)
NPV:          100.0% (94.9% - 100.0%)
Accuracy:     100.0%
Cohen's κ:    1.000 (1.000 - 1.000)
N:            100
```

### Social-Emotional

```
Confusion Matrix: TP=34 FP=0 TN=66 FN=0
Sensitivity:  100.0% (89.8% - 100.0%)
Specificity:  100.0% (94.5% - 100.0%)
PPV:          100.0% (89.8% - 100.0%)
NPV:          100.0% (94.5% - 100.0%)
Accuracy:     100.0%
Cohen's κ:    1.000 (1.000 - 1.000)
N:            100
```

### Cognitive / Play

```
Confusion Matrix: TP=22 FP=0 TN=78 FN=0
Sensitivity:  100.0% (85.1% - 100.0%)
Specificity:  100.0% (95.3% - 100.0%)
PPV:          100.0% (85.1% - 100.0%)
NPV:          100.0% (95.3% - 100.0%)
Accuracy:     100.0%
Cohen's κ:    1.000 (1.000 - 1.000)
N:            100
```

### Self-Help / Adaptive

```
Confusion Matrix: TP=10 FP=0 TN=90 FN=0
Sensitivity:  100.0% (72.2% - 100.0%)
Specificity:  100.0% (95.9% - 100.0%)
PPV:          100.0% (72.2% - 100.0%)
NPV:          100.0% (95.9% - 100.0%)
Accuracy:     100.0%
Cohen's κ:    1.000 (1.000 - 1.000)
N:            100
```

### Vision / Hearing

```
Confusion Matrix: TP=23 FP=0 TN=77 FN=0
Sensitivity:  100.0% (85.7% - 100.0%)
Specificity:  100.0% (95.2% - 100.0%)
PPV:          100.0% (85.7% - 100.0%)
NPV:          100.0% (95.2% - 100.0%)
Accuracy:     100.0%
Cohen's κ:    1.000 (1.000 - 1.000)
N:            100
```

## Methodology

This report uses rule-derived known-answer synthetic profiles where the
ground truth is definitionally obvious from the profile design. It measures
whether the engine produces expected outputs for known developmental
trajectories. This is software verification, not clinical validation.

**Evaluation path:** Each profile is evaluated through the full public engine
pipeline, including regression detection (achieved→not_yet pattern escalation).

**Binary threshold:** Domain status ∈ {high_concern, moderate_concern} = positive (concern).
All other domain statuses (normal, watch, low_concern, insufficient_evidence) = negative.

**Abstention handling:** When the engine returns `insufficient_evidence` for a domain,
it is counted as a negative classification but reported separately in the Abstention
Analysis section. This ensures transparency about the engine declining to classify
versus actively ruling out concern.

**Confidence intervals:** Wilson score method for proportions, normal approximation for kappa.

**Limitations:** N represents domain-profile pairs, not independent children.
Prevalence is designer-controlled, so PPV/NPV reflect the synthetic mix, not
real-world prevalence. Cohen's kappa measures agreement with authored expectations,
not an independent gold standard.
