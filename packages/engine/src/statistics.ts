/**
 * Statistical metrics for internal consistency validation.
 *
 * Calculates sensitivity, specificity, PPV, NPV, Cohen's kappa, and
 * Wilson score confidence intervals for binary classification results.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfusionMatrix {
  tp: number; // true positives
  fp: number; // false positives
  tn: number; // true negatives
  fn: number; // false negatives
}

export interface BinaryMetrics {
  sensitivity: number; // TP / (TP + FN)
  specificity: number; // TN / (TN + FP)
  ppv: number;         // TP / (TP + FP) — positive predictive value
  npv: number;         // TN / (TN + FN) — negative predictive value
  accuracy: number;    // (TP + TN) / total
  prevalence: number;  // (TP + FN) / total
  n: number;           // total observations
}

export interface MetricsWithCI extends BinaryMetrics {
  sensitivityCI: [number, number];
  specificityCI: [number, number];
  ppvCI: [number, number];
  npvCI: [number, number];
  kappa: number;
  kappaCI: [number, number];
}

export interface DomainMetrics {
  domain: string;
  confusionMatrix: ConfusionMatrix;
  metrics: MetricsWithCI;
}

export interface ValidationReport {
  timestamp: string;
  engineVersion: string;
  profileCount: number;
  globalMetrics: MetricsWithCI;
  domainMetrics: DomainMetrics[];
  abstentions?: {
    total: number;
    correctlyNegative: number;
    incorrectlyNegative: number;
  };
  disclaimer: string;
}

// ---------------------------------------------------------------------------
// Wilson score interval (95% CI for proportions)
// ---------------------------------------------------------------------------

/**
 * Wilson score interval for a binomial proportion.
 * More accurate than the normal approximation for small samples.
 */
export function wilsonCI(
  successes: number,
  total: number,
  z: number = 1.96, // 95% CI
): [number, number] {
  if (total === 0) return [0, 0];

  const p = successes / total;
  const denom = 1 + z * z / total;
  const centre = p + z * z / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * total)) / total);

  const lower = Math.max(0, (centre - margin) / denom);
  const upper = Math.min(1, (centre + margin) / denom);

  return [lower, upper];
}

// ---------------------------------------------------------------------------
// Cohen's kappa
// ---------------------------------------------------------------------------

/**
 * Cohen's kappa for binary agreement.
 *
 * kappa = (p_o - p_e) / (1 - p_e)
 * where p_o = observed agreement, p_e = expected agreement by chance.
 */
export function cohensKappa(matrix: ConfusionMatrix): number {
  const total = matrix.tp + matrix.fp + matrix.tn + matrix.fn;
  if (total === 0) return 0;

  const po = (matrix.tp + matrix.tn) / total;

  const raterAPositive = (matrix.tp + matrix.fp) / total;
  const raterBPositive = (matrix.tp + matrix.fn) / total;
  const raterANegative = (matrix.tn + matrix.fn) / total;
  const raterBNegative = (matrix.tn + matrix.fp) / total;

  const pe = raterAPositive * raterBPositive + raterANegative * raterBNegative;

  if (pe === 1) return 1; // perfect agreement edge case

  return (po - pe) / (1 - pe);
}

/**
 * Approximate standard error for kappa (Fleiss et al.).
 * Used to compute confidence intervals.
 */
export function kappaStandardError(matrix: ConfusionMatrix): number {
  const total = matrix.tp + matrix.fp + matrix.tn + matrix.fn;
  if (total === 0) return 0;

  const po = (matrix.tp + matrix.tn) / total;

  const raterAPositive = (matrix.tp + matrix.fp) / total;
  const raterBPositive = (matrix.tp + matrix.fn) / total;
  const pe = raterAPositive * raterBPositive +
    (1 - raterAPositive) * (1 - raterBPositive);

  if (pe === 1) return 0;

  const se = Math.sqrt(po * (1 - po) / (total * (1 - pe) * (1 - pe)));
  return se;
}

/**
 * 95% CI for kappa using normal approximation.
 */
export function kappaCI(
  matrix: ConfusionMatrix,
  z: number = 1.96,
): [number, number] {
  const k = cohensKappa(matrix);
  const se = kappaStandardError(matrix);
  return [
    Math.max(-1, k - z * se),
    Math.min(1, k + z * se),
  ];
}

// ---------------------------------------------------------------------------
// Metric computation
// ---------------------------------------------------------------------------

export function computeBinaryMetrics(matrix: ConfusionMatrix): BinaryMetrics {
  const total = matrix.tp + matrix.fp + matrix.tn + matrix.fn;

  return {
    sensitivity: (matrix.tp + matrix.fn) > 0
      ? matrix.tp / (matrix.tp + matrix.fn)
      : 0,
    specificity: (matrix.tn + matrix.fp) > 0
      ? matrix.tn / (matrix.tn + matrix.fp)
      : 0,
    ppv: (matrix.tp + matrix.fp) > 0
      ? matrix.tp / (matrix.tp + matrix.fp)
      : 0,
    npv: (matrix.tn + matrix.fn) > 0
      ? matrix.tn / (matrix.tn + matrix.fn)
      : 0,
    accuracy: total > 0
      ? (matrix.tp + matrix.tn) / total
      : 0,
    prevalence: total > 0
      ? (matrix.tp + matrix.fn) / total
      : 0,
    n: total,
  };
}

export function computeMetricsWithCI(matrix: ConfusionMatrix): MetricsWithCI {
  const base = computeBinaryMetrics(matrix);

  return {
    ...base,
    sensitivityCI: wilsonCI(matrix.tp, matrix.tp + matrix.fn),
    specificityCI: wilsonCI(matrix.tn, matrix.tn + matrix.fp),
    ppvCI: wilsonCI(matrix.tp, matrix.tp + matrix.fp),
    npvCI: wilsonCI(matrix.tn, matrix.tn + matrix.fn),
    kappa: cohensKappa(matrix),
    kappaCI: kappaCI(matrix),
  };
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

export function formatMetrics(m: MetricsWithCI): string {
  const pct = (v: number) => (v * 100).toFixed(1) + '%';
  const ci = (pair: [number, number]) =>
    `(${pct(pair[0])} - ${pct(pair[1])})`;

  return [
    `Sensitivity:  ${pct(m.sensitivity)} ${ci(m.sensitivityCI)}`,
    `Specificity:  ${pct(m.specificity)} ${ci(m.specificityCI)}`,
    `PPV:          ${pct(m.ppv)} ${ci(m.ppvCI)}`,
    `NPV:          ${pct(m.npv)} ${ci(m.npvCI)}`,
    `Accuracy:     ${pct(m.accuracy)}`,
    `Cohen's κ:    ${m.kappa.toFixed(3)} (${m.kappaCI[0].toFixed(3)} - ${m.kappaCI[1].toFixed(3)})`,
    `N:            ${m.n}`,
  ].join('\n');
}

export function formatReport(report: ValidationReport): string {
  const lines: string[] = [];

  lines.push('# MyChild Engine — Synthetic Scenario Verification Report');
  lines.push('');
  lines.push(`**Generated:** ${report.timestamp}`);
  lines.push(`**Engine version:** ${report.engineVersion}`);
  lines.push(`**Profiles evaluated:** ${report.profileCount}`);
  lines.push('');
  lines.push('> ' + report.disclaimer);
  lines.push('');

  if (report.abstentions && report.abstentions.total > 0) {
    lines.push('## Abstention Analysis');
    lines.push('');
    lines.push('When the engine has insufficient evidence for a domain (fewer than 2 answered');
    lines.push('questions), it returns `insufficient_evidence` rather than a classification.');
    lines.push('These abstentions are counted as negatives in the metrics above but reported');
    lines.push('separately here for transparency.');
    lines.push('');
    lines.push('```');
    lines.push(`Total abstentions:                  ${report.abstentions.total}`);
    lines.push(`  Correctly negative (ground truth): ${report.abstentions.correctlyNegative}`);
    lines.push(`  Incorrectly negative (missed):     ${report.abstentions.incorrectlyNegative}`);
    const pctOfNeg = report.globalMetrics.n > 0
      ? ((report.abstentions.total / report.globalMetrics.n) * 100).toFixed(1)
      : '0';
    lines.push(`  % of total observations:           ${pctOfNeg}%`);
    lines.push('```');
    lines.push('');
    lines.push('**Note:** A high abstention rate means the engine is correctly declining to');
    lines.push('classify when it lacks data, but it also means the reported specificity');
    lines.push('includes cases where the engine abstained rather than actively ruled out concern.');
    lines.push('');
  }

  lines.push('## Global Metrics');
  lines.push('');
  lines.push('```');
  lines.push(formatMetrics(report.globalMetrics));
  lines.push('```');
  lines.push('');

  lines.push('## Per-Domain Metrics');
  lines.push('');

  for (const dm of report.domainMetrics) {
    lines.push(`### ${dm.domain}`);
    lines.push('');
    lines.push('```');
    lines.push(`Confusion Matrix: TP=${dm.confusionMatrix.tp} FP=${dm.confusionMatrix.fp} TN=${dm.confusionMatrix.tn} FN=${dm.confusionMatrix.fn}`);
    lines.push(formatMetrics(dm.metrics));
    lines.push('```');
    lines.push('');
  }

  lines.push('## Methodology');
  lines.push('');
  lines.push('This report uses rule-derived known-answer synthetic profiles where the');
  lines.push('ground truth is definitionally obvious from the profile design. It measures');
  lines.push('whether the engine produces expected outputs for known developmental');
  lines.push('trajectories. This is software verification, not clinical validation.');
  lines.push('');
  lines.push('**Evaluation path:** Each profile is evaluated through the full public engine');
  lines.push('pipeline, including regression detection (achieved→not_yet pattern escalation).');
  lines.push('');
  lines.push('**Binary threshold:** Domain status ∈ {high_concern, moderate_concern} = positive (concern).');
  lines.push('All other domain statuses (normal, watch, low_concern, insufficient_evidence) = negative.');
  lines.push('');
  lines.push('**Abstention handling:** When the engine returns `insufficient_evidence` for a domain,');
  lines.push('it is counted as a negative classification but reported separately in the Abstention');
  lines.push('Analysis section. This ensures transparency about the engine declining to classify');
  lines.push('versus actively ruling out concern.');
  lines.push('');
  lines.push('**Confidence intervals:** Wilson score method for proportions, normal approximation for kappa.');
  lines.push('');
  lines.push('**Limitations:** N represents domain-profile pairs, not independent children.');
  lines.push('Prevalence is designer-controlled, so PPV/NPV reflect the synthetic mix, not');
  lines.push('real-world prevalence. Cohen\'s kappa measures agreement with authored expectations,');
  lines.push('not an independent gold standard.');
  lines.push('');

  return lines.join('\n');
}
