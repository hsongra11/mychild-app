import { describe, it, expect } from 'vitest';
import {
  classifyDomainStatus,
  validateProfile,
  runValidation,
  type ValidationProfile,
} from '../validation.js';

describe('classifyDomainStatus', () => {
  it('classifies high_concern as concern', () => {
    expect(classifyDomainStatus('high_concern')).toBe('concern');
  });

  it('classifies moderate_concern as concern', () => {
    expect(classifyDomainStatus('moderate_concern')).toBe('concern');
  });

  it('classifies normal as no_concern', () => {
    expect(classifyDomainStatus('normal')).toBe('no_concern');
  });

  it('classifies watch as no_concern', () => {
    expect(classifyDomainStatus('watch')).toBe('no_concern');
  });

  it('classifies low_concern as no_concern', () => {
    expect(classifyDomainStatus('low_concern')).toBe('no_concern');
  });

  it('classifies insufficient_evidence as no_concern', () => {
    expect(classifyDomainStatus('insufficient_evidence')).toBe('no_concern');
  });
});

describe('validateProfile', () => {
  it('correctly validates a typical development profile', () => {
    const profile: ValidationProfile = {
      id: 'test_typical',
      name: 'Test Typical',
      description: 'All achieved',
      category: 'typical',
      child: { dob: '2025-06-01' },
      events: [
        { weekOffset: 8, questionId: 'q_0_2m_05', answer: 'achieved' },
        { weekOffset: 8, questionId: 'q_0_2m_09', answer: 'achieved' },
        { weekOffset: 8, questionId: 'q_0_2m_10', answer: 'achieved' },
      ],
      groundTruth: { EL: 'no_concern', GM: 'no_concern' },
    };

    const result = validateProfile(profile);
    expect(result.profileId).toBe('test_typical');

    for (const dr of result.domainResults) {
      expect(dr.correct).toBe(true);
      expect(dr.engineClassification).toBe('no_concern');
    }
  });

  it('correctly validates a delay profile', () => {
    const profile: ValidationProfile = {
      id: 'test_delay',
      name: 'Test Motor Delay',
      description: 'Motor milestones missed',
      category: 'motor_delay',
      child: { dob: '2025-01-01' },
      events: [
        { weekOffset: 16, questionId: 'q_3_5m_12', answer: 'not_yet' },
        { weekOffset: 28, questionId: 'q_6_8m_10', answer: 'not_yet' },
        { weekOffset: 28, questionId: 'q_6_8m_11', answer: 'not_yet' },
        { weekOffset: 28, questionId: 'q_6_8m_13', answer: 'not_yet' },
        { weekOffset: 38, questionId: 'q_9_11m_10', answer: 'not_yet' },
        { weekOffset: 38, questionId: 'q_9_11m_13', answer: 'not_yet' },
      ],
      groundTruth: { GM: 'concern' },
    };

    const result = validateProfile(profile);
    const gmResult = result.domainResults.find((dr) => dr.domain === 'GM');
    expect(gmResult).toBeDefined();
    expect(gmResult!.correct).toBe(true);
    expect(gmResult!.engineClassification).toBe('concern');
  });
});

describe('runValidation', () => {
  it('produces a report with correct structure', () => {
    const profiles: ValidationProfile[] = [
      {
        id: 'test_01',
        name: 'Test Profile',
        description: 'Simple test',
        category: 'typical',
        child: { dob: '2025-06-01' },
        events: [
          { weekOffset: 8, questionId: 'q_0_2m_05', answer: 'achieved' },
          { weekOffset: 8, questionId: 'q_0_2m_09', answer: 'achieved' },
        ],
        groundTruth: { EL: 'no_concern', GM: 'no_concern' },
      },
    ];

    const { profileResults, report } = runValidation(profiles);

    expect(profileResults).toHaveLength(1);
    expect(report.profileCount).toBe(1);
    expect(report.disclaimer).toContain('Internal Consistency Verification');
    expect(report.globalMetrics.n).toBeGreaterThan(0);
    expect(report.globalMetrics.sensitivity).toBeGreaterThanOrEqual(0);
    expect(report.globalMetrics.specificity).toBeGreaterThanOrEqual(0);
  });

  it('runs the full synthetic profile set without errors', () => {
    const profilesData = require('../../data/synthetic-profiles.json');
    const { profileResults, report } = runValidation(profilesData);

    expect(profileResults.length).toBeGreaterThanOrEqual(100);
    expect(report.profileCount).toBeGreaterThanOrEqual(100);
    expect(report.globalMetrics.accuracy).toBeGreaterThanOrEqual(0.85);
  });
});
