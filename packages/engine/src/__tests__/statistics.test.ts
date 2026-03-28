import { describe, it, expect } from 'vitest';
import {
  wilsonCI,
  cohensKappa,
  computeBinaryMetrics,
  computeMetricsWithCI,
  type ConfusionMatrix,
} from '../statistics.js';

describe('computeBinaryMetrics', () => {
  it('calculates sensitivity correctly', () => {
    const matrix: ConfusionMatrix = { tp: 10, fp: 2, tn: 80, fn: 5 };
    const m = computeBinaryMetrics(matrix);
    expect(m.sensitivity).toBeCloseTo(10 / 15, 4); // 0.6667
  });

  it('calculates specificity correctly', () => {
    const matrix: ConfusionMatrix = { tp: 10, fp: 2, tn: 80, fn: 5 };
    const m = computeBinaryMetrics(matrix);
    expect(m.specificity).toBeCloseTo(80 / 82, 4); // 0.9756
  });

  it('calculates PPV correctly', () => {
    const matrix: ConfusionMatrix = { tp: 10, fp: 2, tn: 80, fn: 5 };
    const m = computeBinaryMetrics(matrix);
    expect(m.ppv).toBeCloseTo(10 / 12, 4); // 0.8333
  });

  it('calculates NPV correctly', () => {
    const matrix: ConfusionMatrix = { tp: 10, fp: 2, tn: 80, fn: 5 };
    const m = computeBinaryMetrics(matrix);
    expect(m.npv).toBeCloseTo(80 / 85, 4); // 0.9412
  });

  it('handles zero denominator (no positives)', () => {
    const matrix: ConfusionMatrix = { tp: 0, fp: 0, tn: 100, fn: 0 };
    const m = computeBinaryMetrics(matrix);
    expect(m.sensitivity).toBe(0);
    expect(m.ppv).toBe(0);
    expect(m.specificity).toBeCloseTo(1, 4);
    expect(m.npv).toBeCloseTo(1, 4);
  });

  it('handles zero denominator (no negatives)', () => {
    const matrix: ConfusionMatrix = { tp: 50, fp: 0, tn: 0, fn: 0 };
    const m = computeBinaryMetrics(matrix);
    expect(m.sensitivity).toBeCloseTo(1, 4);
    expect(m.specificity).toBe(0);
  });

  it('handles empty matrix', () => {
    const matrix: ConfusionMatrix = { tp: 0, fp: 0, tn: 0, fn: 0 };
    const m = computeBinaryMetrics(matrix);
    expect(m.accuracy).toBe(0);
    expect(m.n).toBe(0);
  });

  it('calculates perfect metrics', () => {
    const matrix: ConfusionMatrix = { tp: 30, fp: 0, tn: 70, fn: 0 };
    const m = computeBinaryMetrics(matrix);
    expect(m.sensitivity).toBe(1);
    expect(m.specificity).toBe(1);
    expect(m.ppv).toBe(1);
    expect(m.npv).toBe(1);
    expect(m.accuracy).toBe(1);
  });
});

describe('wilsonCI', () => {
  it('returns [0, 0] for zero total', () => {
    expect(wilsonCI(0, 0)).toEqual([0, 0]);
  });

  it('returns interval containing the proportion', () => {
    const [lower, upper] = wilsonCI(80, 100);
    expect(lower).toBeLessThan(0.8);
    expect(upper).toBeGreaterThan(0.8);
  });

  it('bounds are between 0 and 1', () => {
    const [lower, upper] = wilsonCI(99, 100);
    expect(lower).toBeGreaterThanOrEqual(0);
    expect(upper).toBeLessThanOrEqual(1);
  });

  it('perfect score has upper bound at or near 1', () => {
    const [, upper] = wilsonCI(100, 100);
    expect(upper).toBeCloseTo(1, 5);
  });
});

describe('cohensKappa', () => {
  it('returns 1 for perfect agreement', () => {
    const matrix: ConfusionMatrix = { tp: 30, fp: 0, tn: 70, fn: 0 };
    expect(cohensKappa(matrix)).toBeCloseTo(1, 4);
  });

  it('returns 0 for chance agreement', () => {
    // When agreement equals expected by chance
    const matrix: ConfusionMatrix = { tp: 25, fp: 25, tn: 25, fn: 25 };
    expect(cohensKappa(matrix)).toBeCloseTo(0, 4);
  });

  it('returns 0 for empty matrix', () => {
    const matrix: ConfusionMatrix = { tp: 0, fp: 0, tn: 0, fn: 0 };
    expect(cohensKappa(matrix)).toBe(0);
  });

  it('handles high agreement correctly', () => {
    const matrix: ConfusionMatrix = { tp: 45, fp: 2, tn: 48, fn: 5 };
    const k = cohensKappa(matrix);
    expect(k).toBeGreaterThan(0.8);
    expect(k).toBeLessThan(1);
  });
});

describe('computeMetricsWithCI', () => {
  it('includes confidence intervals', () => {
    const matrix: ConfusionMatrix = { tp: 10, fp: 2, tn: 80, fn: 5 };
    const m = computeMetricsWithCI(matrix);

    expect(m.sensitivityCI).toHaveLength(2);
    expect(m.sensitivityCI[0]).toBeLessThan(m.sensitivity);
    expect(m.sensitivityCI[1]).toBeGreaterThan(m.sensitivity);

    expect(m.kappaCI).toHaveLength(2);
    expect(m.kappaCI[0]).toBeLessThanOrEqual(m.kappa);
    expect(m.kappaCI[1]).toBeGreaterThanOrEqual(m.kappa);
  });
});
