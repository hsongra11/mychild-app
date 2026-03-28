/**
 * Synthetic profile generator for internal consistency validation.
 *
 * Generates 100+ rule-derived known-answer profiles across all age bands
 * where ground truth is definitionally obvious from the profile design.
 */

import type { DomainTag } from './types.js';
import type { ValidationProfile, GroundTruthLabel } from './validation.js';
import { getAllQuestions, getUniversalRedFlags, getQuestionById, getQuestionsByAgeBand } from './question-bank.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface QuestionInfo {
  id: string;
  tags: DomainTag[];
  normativeAgeMonths: number;
  weight: string;
}

const ALL_DOMAIN_TAGS: DomainTag[] = ['GM', 'FM', 'RL', 'EL', 'SE', 'CP', 'SH', 'VH'];

function getAllQuestionInfo(): QuestionInfo[] {
  return getAllQuestions().map((q) => ({
    id: q.id,
    tags: q.tags as DomainTag[],
    normativeAgeMonths: q.normativeAgeMonths,
    weight: q.weight,
  }));
}

function getQuestionsForAgeBand(
  allQuestions: QuestionInfo[],
  minMonths: number,
  maxMonths: number,
): QuestionInfo[] {
  return allQuestions.filter(
    (q) => q.normativeAgeMonths >= minMonths && q.normativeAgeMonths <= maxMonths,
  );
}

function getQuestionsByDomainTag(
  questions: QuestionInfo[],
  tag: DomainTag,
): QuestionInfo[] {
  return questions.filter((q) => q.tags.includes(tag));
}

function dobForAge(targetAgeMonths: number): string {
  const now = new Date('2026-01-15');
  const dob = new Date(now.getTime() - targetAgeMonths * 30.44 * 24 * 60 * 60 * 1000);
  return dob.toISOString().split('T')[0];
}

function weekOffsetForAge(normativeMonths: number): number {
  return Math.round(normativeMonths * 4.345);
}

// ---------------------------------------------------------------------------
// Profile generators by category
// ---------------------------------------------------------------------------

function generateTypicalProfiles(allQuestions: QuestionInfo[]): ValidationProfile[] {
  const profiles: ValidationProfile[] = [];
  const redFlags = getUniversalRedFlags();

  // One typical profile per age band
  const ageBands = [
    { name: '2 months', min: 0, max: 2, childAge: 3 },
    { name: '4 months', min: 3, max: 5, childAge: 5 },
    { name: '6 months', min: 5, max: 8, childAge: 8 },
    { name: '9 months', min: 8, max: 11, childAge: 11 },
    { name: '12 months', min: 11, max: 14, childAge: 14 },
    { name: '15 months', min: 14, max: 17, childAge: 17 },
    { name: '18 months', min: 17, max: 20, childAge: 20 },
    { name: '21 months', min: 20, max: 23, childAge: 23 },
    { name: '24 months', min: 23, max: 29, childAge: 29 },
    { name: '30 months', min: 29, max: 36, childAge: 36 },
  ];

  for (let i = 0; i < ageBands.length; i++) {
    const band = ageBands[i];
    const questions = getQuestionsForAgeBand(allQuestions, band.min, band.max);
    const dob = dobForAge(band.childAge);

    // All achieved
    const events = questions.map((q) => ({
      weekOffset: weekOffsetForAge(q.normativeAgeMonths),
      questionId: q.id,
      answer: 'achieved' as const,
    }));

    // Add red flag answers (all achieved for typical)
    events.push(
      { weekOffset: weekOffsetForAge(band.childAge), questionId: 'rf_01', answer: 'achieved' as const },
      { weekOffset: weekOffsetForAge(band.childAge), questionId: 'rf_02', answer: 'achieved' as const },
    );

    // Ground truth: no concern for all domains present
    const domains = new Set<DomainTag>();
    for (const q of questions) {
      for (const tag of q.tags) {
        if (tag !== 'RF') domains.add(tag);
      }
    }

    const groundTruth: Partial<Record<DomainTag, GroundTruthLabel>> = {};
    for (const d of domains) {
      groundTruth[d] = 'no_concern';
    }

    profiles.push({
      id: `typical_band_${i + 1}`,
      name: `Typical development at ${band.name}`,
      description: `All milestones achieved on time through ${band.name}`,
      category: 'typical',
      child: { dob },
      events,
      groundTruth,
    });
  }

  // Preterm typical profiles (3 variants)
  const pretermWeeks = [32, 34, 36];
  for (let i = 0; i < pretermWeeks.length; i++) {
    const gestWeeks = pretermWeeks[i];
    const questions = getQuestionsForAgeBand(allQuestions, 0, 5);
    const dob = dobForAge(6); // 6 months chronological

    const events = questions.map((q) => ({
      weekOffset: weekOffsetForAge(q.normativeAgeMonths) + (40 - gestWeeks), // offset for prematurity
      questionId: q.id,
      answer: 'achieved' as const,
    }));
    events.push(
      { weekOffset: 26, questionId: 'rf_01', answer: 'achieved' as const },
      { weekOffset: 26, questionId: 'rf_02', answer: 'achieved' as const },
    );

    const groundTruth: Partial<Record<DomainTag, GroundTruthLabel>> = {
      SE: 'no_concern', EL: 'no_concern', GM: 'no_concern', FM: 'no_concern',
    };

    profiles.push({
      id: `typical_preterm_${gestWeeks}w`,
      name: `Typical preterm (${gestWeeks} weeks) at 6 months`,
      description: `Born at ${gestWeeks} weeks, all milestones on corrected-age track`,
      category: 'typical',
      child: { dob, gestationalWeeks: gestWeeks },
      events,
      groundTruth,
    });
  }

  // Additional typical with sparse answers (tests confidence gating)
  for (let i = 0; i < 5; i++) {
    const bandIdx = i * 2; // 0, 2, 4, 6, 8
    if (bandIdx >= ageBands.length) break;
    const band = ageBands[bandIdx];
    const questions = getQuestionsForAgeBand(allQuestions, band.min, band.max);
    const dob = dobForAge(band.childAge);

    // Only answer 2-3 questions (sparse)
    const subset = questions.slice(0, Math.min(3, questions.length));
    const events = subset.map((q) => ({
      weekOffset: weekOffsetForAge(q.normativeAgeMonths),
      questionId: q.id,
      answer: 'achieved' as const,
    }));
    events.push(
      { weekOffset: weekOffsetForAge(band.childAge), questionId: 'rf_01', answer: 'achieved' as const },
    );

    const domains = new Set<DomainTag>();
    for (const q of subset) {
      for (const tag of q.tags) {
        if (tag !== 'RF') domains.add(tag);
      }
    }
    const groundTruth: Partial<Record<DomainTag, GroundTruthLabel>> = {};
    for (const d of domains) {
      groundTruth[d] = 'no_concern';
    }

    profiles.push({
      id: `typical_sparse_${i + 1}`,
      name: `Typical sparse answers at ${band.name}`,
      description: `Only ${subset.length} questions answered, all achieved`,
      category: 'typical',
      child: { dob },
      events,
      groundTruth,
    });
  }

  return profiles;
}

function generateSpeechDelayProfiles(allQuestions: QuestionInfo[]): ValidationProfile[] {
  const profiles: ValidationProfile[] = [];

  // Speech delay at different ages
  const scenarios = [
    { age: 9, label: '9 months', langMin: 0, langMax: 9, motorMin: 0, motorMax: 9 },
    { age: 12, label: '12 months', langMin: 0, langMax: 12, motorMin: 0, motorMax: 12 },
    { age: 15, label: '15 months', langMin: 0, langMax: 15, motorMin: 0, motorMax: 15 },
    { age: 18, label: '18 months', langMin: 0, langMax: 18, motorMin: 0, motorMax: 18 },
    { age: 21, label: '21 months', langMin: 0, langMax: 21, motorMin: 0, motorMax: 21 },
    { age: 24, label: '24 months', langMin: 0, langMax: 24, motorMin: 0, motorMax: 24 },
    { age: 30, label: '30 months', langMin: 0, langMax: 30, motorMin: 0, motorMax: 30 },
  ];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const dob = dobForAge(s.age);
    const langQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, s.age),
      'EL',
    ).slice(0, 6);
    const motorQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, s.age),
      'GM',
    ).slice(0, 4);

    const events = [
      ...langQuestions.map((q) => ({
        weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, s.age - 3)),
        questionId: q.id,
        answer: 'not_yet' as const,
      })),
      ...motorQuestions.map((q) => ({
        weekOffset: weekOffsetForAge(q.normativeAgeMonths),
        questionId: q.id,
        answer: 'achieved' as const,
      })),
      { weekOffset: weekOffsetForAge(s.age), questionId: 'rf_01', answer: 'achieved' as const },
    ];

    profiles.push({
      id: `speech_delay_${i + 1}`,
      name: `Speech delay at ${s.label}`,
      description: `Language milestones not_yet, motor on track at ${s.label}`,
      category: 'speech_delay',
      child: { dob },
      events,
      groundTruth: { EL: 'concern', GM: 'no_concern' },
    });
  }

  // Receptive + expressive delay
  for (const age of [18, 24]) {
    const dob = dobForAge(age);
    const elQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'EL',
    ).slice(0, 4);
    const rlQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'RL',
    ).slice(0, 4);
    const gmQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'GM',
    ).slice(0, 3);

    const events = [
      ...elQuestions.map((q) => ({ weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, age - 3)), questionId: q.id, answer: 'not_yet' as const })),
      ...rlQuestions.map((q) => ({ weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, age - 3)), questionId: q.id, answer: 'not_yet' as const })),
      ...gmQuestions.map((q) => ({ weekOffset: weekOffsetForAge(q.normativeAgeMonths), questionId: q.id, answer: 'achieved' as const })),
      { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
    ];

    profiles.push({
      id: `speech_receptive_delay_${age}m`,
      name: `Receptive + expressive delay at ${age} months`,
      description: `Both receptive and expressive language delayed, motor on track`,
      category: 'speech_delay',
      child: { dob },
      events,
      groundTruth: { EL: 'concern', RL: 'concern', GM: 'no_concern' },
    });
  }

  return profiles;
}

function generateMotorDelayProfiles(allQuestions: QuestionInfo[]): ValidationProfile[] {
  const profiles: ValidationProfile[] = [];

  // Gross motor delay at different ages
  for (const age of [6, 9, 12, 15, 18, 24]) {
    const dob = dobForAge(age);
    const gmQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'GM',
    ).slice(0, 5);
    const elQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'EL',
    ).slice(0, 3);

    const events = [
      ...gmQuestions.map((q) => ({ weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, age - 3)), questionId: q.id, answer: 'not_yet' as const })),
      ...elQuestions.map((q) => ({ weekOffset: weekOffsetForAge(q.normativeAgeMonths), questionId: q.id, answer: 'achieved' as const })),
      { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
    ];

    profiles.push({
      id: `motor_delay_gm_${age}m`,
      name: `Gross motor delay at ${age} months`,
      description: `GM milestones not_yet, language on track`,
      category: 'motor_delay',
      child: { dob },
      events,
      groundTruth: { GM: 'concern', EL: 'no_concern' },
    });
  }

  // Fine motor delay at different ages
  for (const age of [9, 12, 18, 24]) {
    const dob = dobForAge(age);
    const fmQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'FM',
    ).slice(0, 5);
    const gmQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'GM',
    ).slice(0, 3);

    const events = [
      ...fmQuestions.map((q) => ({ weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, age - 3)), questionId: q.id, answer: 'not_yet' as const })),
      ...gmQuestions.map((q) => ({ weekOffset: weekOffsetForAge(q.normativeAgeMonths), questionId: q.id, answer: 'achieved' as const })),
      { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
    ];

    profiles.push({
      id: `motor_delay_fm_${age}m`,
      name: `Fine motor delay at ${age} months`,
      description: `FM milestones not_yet, gross motor on track`,
      category: 'motor_delay',
      child: { dob },
      events,
      groundTruth: { FM: 'concern', GM: 'no_concern' },
    });
  }

  return profiles;
}

function generateGlobalDelayProfiles(allQuestions: QuestionInfo[]): ValidationProfile[] {
  const profiles: ValidationProfile[] = [];

  for (const age of [6, 9, 12, 18, 24, 30]) {
    const dob = dobForAge(age);
    const questions = getQuestionsForAgeBand(allQuestions, 0, age).filter(
      (q) => !q.tags.includes('RF'),
    );

    // All milestones not_yet — global delay
    const events: { weekOffset: number; questionId: string; answer: 'achieved' | 'not_yet' | 'unsure' }[] =
      questions.slice(0, 12).map((q) => ({
        weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, age - 3)),
        questionId: q.id,
        answer: 'not_yet' as const,
      }));
    events.push(
      { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
    );

    // Ground truth: concern for all domains that have questions
    const domains = new Set<DomainTag>();
    for (const q of questions.slice(0, 12)) {
      for (const tag of q.tags) {
        if (tag !== 'RF') domains.add(tag);
      }
    }
    const groundTruth: Partial<Record<DomainTag, GroundTruthLabel>> = {};
    for (const d of domains) {
      groundTruth[d] = 'concern';
    }

    profiles.push({
      id: `global_delay_${age}m`,
      name: `Global delay at ${age} months`,
      description: `All domains delayed at ${age} months`,
      category: 'global_delay',
      child: { dob },
      events,
      groundTruth,
    });
  }

  return profiles;
}

function generateRegressionProfiles(allQuestions: QuestionInfo[]): ValidationProfile[] {
  const profiles: ValidationProfile[] = [];

  // Language regression at different ages
  for (const age of [18, 24, 30]) {
    const dob = dobForAge(age);
    const elQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'EL',
    );

    if (elQuestions.length < 3) continue;

    // First achieve, then regress
    const earlyQ = elQuestions.slice(0, 2);
    const events = [
      ...earlyQ.map((q) => ({
        weekOffset: weekOffsetForAge(q.normativeAgeMonths),
        questionId: q.id,
        answer: 'achieved' as const,
      })),
      // Then same questions answered not_yet later
      ...earlyQ.map((q) => ({
        weekOffset: weekOffsetForAge(age),
        questionId: q.id,
        answer: 'not_yet' as const,
      })),
      { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'not_yet' as const },
    ];

    profiles.push({
      id: `regression_lang_${age}m`,
      name: `Language regression at ${age} months`,
      description: `Language milestones achieved then lost at ${age} months`,
      category: 'mixed_regression',
      child: { dob },
      events,
      groundTruth: { EL: 'concern' },
    });
  }

  // Motor regression at different ages
  for (const age of [12, 18]) {
    const dob = dobForAge(age);
    const gmQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'GM',
    );

    if (gmQuestions.length < 3) continue;

    const earlyQ = gmQuestions.slice(0, 2);
    const events = [
      ...earlyQ.map((q) => ({
        weekOffset: weekOffsetForAge(q.normativeAgeMonths),
        questionId: q.id,
        answer: 'achieved' as const,
      })),
      ...earlyQ.map((q) => ({
        weekOffset: weekOffsetForAge(age),
        questionId: q.id,
        answer: 'not_yet' as const,
      })),
      { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'not_yet' as const },
    ];

    profiles.push({
      id: `regression_motor_${age}m`,
      name: `Motor regression at ${age} months`,
      description: `Motor milestones achieved then lost at ${age} months`,
      category: 'mixed_regression',
      child: { dob },
      events,
      groundTruth: { GM: 'concern' },
    });
  }

  // Social regression (ASD-like pattern)
  const socialDob = dobForAge(24);
  const seQuestions = getQuestionsByDomainTag(
    getQuestionsForAgeBand(allQuestions, 0, 24), 'SE',
  );
  if (seQuestions.length >= 3) {
    const earlyQ = seQuestions.slice(0, 3);
    const events = [
      ...earlyQ.map((q) => ({
        weekOffset: weekOffsetForAge(q.normativeAgeMonths),
        questionId: q.id,
        answer: 'achieved' as const,
      })),
      ...earlyQ.map((q) => ({
        weekOffset: weekOffsetForAge(24),
        questionId: q.id,
        answer: 'not_yet' as const,
      })),
      { weekOffset: weekOffsetForAge(24), questionId: 'rf_01', answer: 'not_yet' as const },
      { weekOffset: weekOffsetForAge(24), questionId: 'rf_03', answer: 'not_yet' as const },
    ];

    profiles.push({
      id: 'regression_social_24m',
      name: 'Social regression at 24 months',
      description: 'Social milestones achieved then lost, ASD-like pattern',
      category: 'mixed_regression',
      child: { dob: socialDob },
      events,
      groundTruth: { SE: 'concern' },
    });
  }

  return profiles;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

function generateMixedProfiles(allQuestions: QuestionInfo[]): ValidationProfile[] {
  const profiles: ValidationProfile[] = [];

  // Motor + language combined delay at different ages
  for (const age of [9, 12, 18, 24]) {
    const dob = dobForAge(age);
    const gmQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'GM',
    ).slice(0, 4);
    const elQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'EL',
    ).slice(0, 4);

    const events: { weekOffset: number; questionId: string; answer: 'achieved' | 'not_yet' | 'unsure' }[] = [
      ...gmQuestions.map((q) => ({
        weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, age - 3)),
        questionId: q.id,
        answer: 'not_yet' as const,
      })),
      ...elQuestions.map((q) => ({
        weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, age - 3)),
        questionId: q.id,
        answer: 'not_yet' as const,
      })),
      { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
    ];

    profiles.push({
      id: `mixed_gm_el_${age}m`,
      name: `Motor + language delay at ${age} months`,
      description: `Both GM and EL delayed, other domains not tested`,
      category: 'global_delay',
      child: { dob },
      events,
      groundTruth: { GM: 'concern', EL: 'concern' },
    });
  }

  // Social-emotional delay at different ages
  for (const age of [6, 9, 12, 18, 24]) {
    const dob = dobForAge(age);
    const seQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'SE',
    ).slice(0, 5);
    const gmQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'GM',
    ).slice(0, 3);

    if (seQuestions.length < 2) continue;

    const events: { weekOffset: number; questionId: string; answer: 'achieved' | 'not_yet' | 'unsure' }[] = [
      ...seQuestions.map((q) => ({
        weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, age - 3)),
        questionId: q.id,
        answer: 'not_yet' as const,
      })),
      ...gmQuestions.map((q) => ({
        weekOffset: weekOffsetForAge(q.normativeAgeMonths),
        questionId: q.id,
        answer: 'achieved' as const,
      })),
      { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
    ];

    profiles.push({
      id: `se_delay_${age}m`,
      name: `Social-emotional delay at ${age} months`,
      description: `SE milestones delayed, motor on track`,
      category: 'speech_delay',
      child: { dob },
      events,
      groundTruth: { SE: 'concern', GM: 'no_concern' },
    });
  }

  // Cognitive delay profiles
  for (const age of [9, 12, 18, 24]) {
    const dob = dobForAge(age);
    const cpQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'CP',
    ).slice(0, 5);
    const gmQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'GM',
    ).slice(0, 3);

    if (cpQuestions.length < 2) continue;

    const events: { weekOffset: number; questionId: string; answer: 'achieved' | 'not_yet' | 'unsure' }[] = [
      ...cpQuestions.map((q) => ({
        weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, age - 3)),
        questionId: q.id,
        answer: 'not_yet' as const,
      })),
      ...gmQuestions.map((q) => ({
        weekOffset: weekOffsetForAge(q.normativeAgeMonths),
        questionId: q.id,
        answer: 'achieved' as const,
      })),
      { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
    ];

    profiles.push({
      id: `cp_delay_${age}m`,
      name: `Cognitive delay at ${age} months`,
      description: `CP milestones delayed, motor on track`,
      category: 'global_delay',
      child: { dob },
      events,
      groundTruth: { CP: 'concern', GM: 'no_concern' },
    });
  }

  // Self-help/adaptive delay profiles
  for (const age of [18, 24, 30]) {
    const dob = dobForAge(age);
    const shQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'SH',
    ).slice(0, 5);
    const elQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'EL',
    ).slice(0, 3);

    if (shQuestions.length < 2) continue;

    const events: { weekOffset: number; questionId: string; answer: 'achieved' | 'not_yet' | 'unsure' }[] = [
      ...shQuestions.map((q) => ({
        weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, age - 3)),
        questionId: q.id,
        answer: 'not_yet' as const,
      })),
      ...elQuestions.map((q) => ({
        weekOffset: weekOffsetForAge(q.normativeAgeMonths),
        questionId: q.id,
        answer: 'achieved' as const,
      })),
      { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
    ];

    profiles.push({
      id: `sh_delay_${age}m`,
      name: `Self-help delay at ${age} months`,
      description: `SH milestones delayed, language on track`,
      category: 'global_delay',
      child: { dob },
      events,
      groundTruth: { SH: 'concern', EL: 'no_concern' },
    });
  }

  // Additional typical with all red flags answered
  for (const age of [3, 6, 12, 18, 24]) {
    const dob = dobForAge(age);
    const bandQuestions = getQuestionsForAgeBand(allQuestions, 0, age).slice(0, 4);
    const redFlags = getUniversalRedFlags();

    const events: { weekOffset: number; questionId: string; answer: 'achieved' | 'not_yet' | 'unsure' }[] = [
      ...bandQuestions.map((q) => ({
        weekOffset: weekOffsetForAge(q.normativeAgeMonths),
        questionId: q.id,
        answer: 'achieved' as const,
      })),
      ...redFlags.map((rf) => ({
        weekOffset: weekOffsetForAge(age),
        questionId: rf.id,
        answer: 'achieved' as const,
      })),
    ];

    const domains = new Set<DomainTag>();
    for (const q of bandQuestions) {
      for (const tag of q.tags) if (tag !== 'RF') domains.add(tag);
    }
    const groundTruth: Partial<Record<DomainTag, GroundTruthLabel>> = {};
    for (const d of domains) groundTruth[d] = 'no_concern';

    profiles.push({
      id: `typical_allrf_${age}m`,
      name: `Typical with all red flags clear at ${age} months`,
      description: `All milestones achieved, all red flags answered achieved`,
      category: 'typical',
      child: { dob },
      events,
      groundTruth,
    });
  }

  return profiles;
}

/**
 * Borderline / adversarial profiles that test the engine's decision boundaries.
 *
 * These profiles sit near classification thresholds. The hand-written ground
 * truth labels below reflect the expected engine behavior based on the scoring
 * rules in domain-scoring.ts:
 *   - flagCount >= 1 → high_concern → "concern"
 *   - warningCount >= 2 || (warningCount >= 1 && streakMissed >= 2) → moderate_concern → "concern"
 *   - Everything else → "no_concern"
 */
function generateBorderlineProfiles(allQuestions: QuestionInfo[]): ValidationProfile[] {
  const profiles: ValidationProfile[] = [];

  // 1. Mixed signals: half achieved, half not_yet in a single domain
  //    At 18 months, GM questions — 3 achieved, 3 not_yet.
  //    With 3 not_yet in a streak, warningCount depends on weight.
  //    Multiple misses across age-appropriate milestones → likely moderate_concern.
  {
    const age = 18;
    const dob = dobForAge(age);
    const gmQ = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'GM',
    ).slice(0, 6);
    if (gmQ.length >= 6) {
      const events: ValidationProfile['events'] = [
        ...gmQ.slice(0, 3).map((q) => ({
          weekOffset: weekOffsetForAge(q.normativeAgeMonths),
          questionId: q.id,
          answer: 'achieved' as const,
        })),
        ...gmQ.slice(3, 6).map((q) => ({
          weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, age - 2)),
          questionId: q.id,
          answer: 'not_yet' as const,
        })),
        { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
      ];
      profiles.push({
        id: 'borderline_mixed_gm_18m',
        name: 'Borderline: mixed GM signals at 18 months',
        description: 'Half GM milestones achieved, half not_yet — tests boundary between concern and no_concern',
        category: 'motor_delay',
        child: { dob },
        events,
        groundTruth: { GM: 'concern' },
      });
    }
  }

  // 2. Single milestone miss among many achieved — clinically this is "monitor",
  //    not "concern". A single missed milestone with 4+ achieved in the same
  //    domain would not prompt a referral in clinical practice.
  //    EXPECTED DISAGREEMENT: engine flags high_concern (aggressive), clinical
  //    judgment says no_concern (watch and wait).
  {
    const age = 12;
    const dob = dobForAge(age);
    const elQ = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'EL',
    ).slice(0, 5);
    if (elQ.length >= 3) {
      const events: ValidationProfile['events'] = [
        ...elQ.slice(0, elQ.length - 1).map((q) => ({
          weekOffset: weekOffsetForAge(q.normativeAgeMonths),
          questionId: q.id,
          answer: 'achieved' as const,
        })),
        {
          weekOffset: weekOffsetForAge(Math.max(elQ[elQ.length - 1].normativeAgeMonths, age - 2)),
          questionId: elQ[elQ.length - 1].id,
          answer: 'not_yet' as const,
        },
        { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
      ];
      profiles.push({
        id: 'borderline_single_miss_el_12m',
        name: 'Borderline: single EL miss at 12 months',
        description: 'One language milestone not_yet among several achieved — clinically would be "monitor"',
        category: 'typical',
        child: { dob },
        events,
        groundTruth: { EL: 'no_concern' },
      });
    }
  }

  // 3. Sparse data — only 2 questions answered, one achieved, one not_yet.
  //    With only 50% of a tiny sample missed, clinical practice would say
  //    "insufficient data to conclude, re-screen." Not "high concern."
  //    EXPECTED DISAGREEMENT: engine flags high_concern, clinical judgment
  //    says insufficient evidence to raise concern.
  {
    const age = 15;
    const dob = dobForAge(age);
    const seQ = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'SE',
    ).slice(0, 2);
    if (seQ.length >= 2) {
      const events: ValidationProfile['events'] = [
        {
          weekOffset: weekOffsetForAge(seQ[0].normativeAgeMonths),
          questionId: seQ[0].id,
          answer: 'achieved' as const,
        },
        {
          weekOffset: weekOffsetForAge(Math.max(seQ[1].normativeAgeMonths, age - 2)),
          questionId: seQ[1].id,
          answer: 'not_yet' as const,
        },
        { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
      ];
      profiles.push({
        id: 'borderline_sparse_se_15m',
        name: 'Borderline: sparse SE data at 15 months',
        description: 'Only 2 SE questions answered, one not_yet — clinically insufficient to flag concern',
        category: 'typical',
        child: { dob },
        events,
        groundTruth: { SE: 'no_concern' },
      });
    }
  }

  // 4. All unsure in a domain — should not trigger concern
  {
    const age = 18;
    const dob = dobForAge(age);
    const cpQ = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'CP',
    ).slice(0, 4);
    if (cpQ.length >= 3) {
      const events: ValidationProfile['events'] = [
        ...cpQ.map((q) => ({
          weekOffset: weekOffsetForAge(q.normativeAgeMonths),
          questionId: q.id,
          answer: 'unsure' as const,
        })),
        { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
      ];
      profiles.push({
        id: 'borderline_all_unsure_cp_18m',
        name: 'Borderline: all unsure CP at 18 months',
        description: 'All cognitive questions answered unsure — should not trigger concern',
        category: 'typical',
        child: { dob },
        events,
        groundTruth: { CP: 'no_concern' },
      });
    }
  }

  // 5. Two warnings without streak — two separate not_yet milestones with
  //    achieved milestones in between → moderate_concern → concern
  {
    const age = 24;
    const dob = dobForAge(age);
    const elQ = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'EL',
    ).slice(0, 6);
    if (elQ.length >= 5) {
      const events: ValidationProfile['events'] = [
        { weekOffset: weekOffsetForAge(elQ[0].normativeAgeMonths), questionId: elQ[0].id, answer: 'not_yet' as const },
        { weekOffset: weekOffsetForAge(elQ[1].normativeAgeMonths), questionId: elQ[1].id, answer: 'achieved' as const },
        { weekOffset: weekOffsetForAge(elQ[2].normativeAgeMonths), questionId: elQ[2].id, answer: 'achieved' as const },
        { weekOffset: weekOffsetForAge(elQ[3].normativeAgeMonths), questionId: elQ[3].id, answer: 'not_yet' as const },
        { weekOffset: weekOffsetForAge(elQ[4].normativeAgeMonths), questionId: elQ[4].id, answer: 'achieved' as const },
        { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
      ];
      profiles.push({
        id: 'borderline_scattered_miss_el_24m',
        name: 'Borderline: scattered EL misses at 24 months',
        description: 'Two non-consecutive EL milestones not_yet — tests warning accumulation without streak',
        category: 'speech_delay',
        child: { dob },
        events,
        groundTruth: { EL: 'concern' },
      });
    }
  }

  // 6. Cross-domain question: multi-tagged question not_yet affects multiple domains
  {
    const age = 6;
    const dob = dobForAge(age);
    // Find multi-tag questions
    const multiTagQ = getQuestionsForAgeBand(allQuestions, 0, age)
      .filter((q) => q.tags.length > 1 && !q.tags.includes('RF' as DomainTag));
    if (multiTagQ.length >= 2) {
      const singleTagQ = getQuestionsForAgeBand(allQuestions, 0, age)
        .filter((q) => q.tags.length === 1 && !q.tags.includes('RF' as DomainTag))
        .slice(0, 3);
      const events: ValidationProfile['events'] = [
        ...multiTagQ.slice(0, 2).map((q) => ({
          weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, age - 2)),
          questionId: q.id,
          answer: 'not_yet' as const,
        })),
        ...singleTagQ.map((q) => ({
          weekOffset: weekOffsetForAge(q.normativeAgeMonths),
          questionId: q.id,
          answer: 'achieved' as const,
        })),
        { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
      ];
      // Ground truth depends on which domains the multi-tag questions touch
      const affectedDomains = new Set<DomainTag>();
      for (const q of multiTagQ.slice(0, 2)) {
        for (const t of q.tags) {
          if (t !== 'RF') affectedDomains.add(t);
        }
      }
      const gt: Partial<Record<DomainTag, GroundTruthLabel>> = {};
      for (const d of affectedDomains) gt[d] = 'concern';
      profiles.push({
        id: 'borderline_multitag_6m',
        name: 'Borderline: multi-tag question miss at 6 months',
        description: 'Not_yet on questions tagged to multiple domains — tests cross-domain impact',
        category: 'global_delay',
        child: { dob },
        events,
        groundTruth: gt,
      });
    }
  }

  // 7. Near-threshold: one not_yet + one unsure among 2 achieved.
  //    Majority of observations are positive (2 achieved vs 1 not_yet + 1 unsure).
  //    Clinically this is "developing, monitor the unsure items" — not a referral.
  //    EXPECTED DISAGREEMENT: engine flags high_concern, clinical judgment says
  //    no_concern (more achieved than missed).
  {
    const age = 18;
    const dob = dobForAge(age);
    const fmQ = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'FM',
    ).slice(0, 5);
    if (fmQ.length >= 4) {
      const events: ValidationProfile['events'] = [
        // First 2 achieved
        ...fmQ.slice(0, 2).map((q) => ({
          weekOffset: weekOffsetForAge(q.normativeAgeMonths),
          questionId: q.id,
          answer: 'achieved' as const,
        })),
        // One not_yet
        {
          weekOffset: weekOffsetForAge(Math.max(fmQ[2].normativeAgeMonths, age - 2)),
          questionId: fmQ[2].id,
          answer: 'not_yet' as const,
        },
        // One unsure
        {
          weekOffset: weekOffsetForAge(fmQ[3].normativeAgeMonths),
          questionId: fmQ[3].id,
          answer: 'unsure' as const,
        },
        { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
      ];
      profiles.push({
        id: 'borderline_near_threshold_fm_18m',
        name: 'Borderline: near-threshold FM at 18 months',
        description: 'One not_yet + one unsure among achieved — clinically would be "monitor"',
        category: 'typical',
        child: { dob },
        events,
        groundTruth: { FM: 'no_concern' },
      });
    }
  }

  // 8. Only 1 question answered in a domain (and it's not_yet).
  //    With a single observation, clinical practice would say "we don't have
  //    enough data to draw conclusions — re-screen with more questions."
  //    EXPECTED DISAGREEMENT: engine flags high_concern (bypasses evidence gate
  //    for flag-severity misses), clinical judgment says no_concern (insufficient data).
  {
    const age = 12;
    const dob = dobForAge(age);
    const rlQ = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'RL',
    ).slice(0, 1);
    const gmQ = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'GM',
    ).slice(0, 3);
    if (rlQ.length >= 1 && gmQ.length >= 2) {
      const events: ValidationProfile['events'] = [
        {
          weekOffset: weekOffsetForAge(Math.max(rlQ[0].normativeAgeMonths, age - 2)),
          questionId: rlQ[0].id,
          answer: 'not_yet' as const,
        },
        ...gmQ.map((q) => ({
          weekOffset: weekOffsetForAge(q.normativeAgeMonths),
          questionId: q.id,
          answer: 'achieved' as const,
        })),
        { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
      ];
      profiles.push({
        id: 'borderline_single_obs_rl_12m',
        name: 'Borderline: single RL observation at 12 months',
        description: 'Only 1 RL question answered (not_yet) — clinically insufficient data to flag',
        category: 'typical',
        child: { dob },
        events,
        groundTruth: { RL: 'no_concern', GM: 'no_concern' },
      });
    }
  }

  return profiles;
}

/**
 * Generate a comprehensive set of synthetic validation profiles.
 * Returns 100+ profiles across all categories and age bands.
 */
export function generateProfiles(): ValidationProfile[] {
  const allQuestions = getAllQuestionInfo();

  const profiles = [
    ...generateTypicalProfiles(allQuestions),
    ...generateSpeechDelayProfiles(allQuestions),
    ...generateMotorDelayProfiles(allQuestions),
    ...generateGlobalDelayProfiles(allQuestions),
    ...generateRegressionProfiles(allQuestions),
    ...generateMixedProfiles(allQuestions),
    ...generateBorderlineProfiles(allQuestions),
  ];

  // Red flag trigger profiles (rf_01 not_yet without prior achievement = not regression but flag)
  for (const age of [3, 6, 9, 12, 18, 24]) {
    const dob = dobForAge(age);
    const gmQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'GM',
    ).slice(0, 3);

    const events: { weekOffset: number; questionId: string; answer: 'achieved' | 'not_yet' | 'unsure' }[] = [
      ...gmQuestions.map((q) => ({
        weekOffset: weekOffsetForAge(q.normativeAgeMonths),
        questionId: q.id,
        answer: 'achieved' as const,
      })),
      { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'not_yet' as const },
      { weekOffset: weekOffsetForAge(age), questionId: 'rf_02', answer: 'achieved' as const },
    ];

    profiles.push({
      id: `redflag_rf01_${age}m`,
      name: `Red flag rf_01 triggered at ${age} months`,
      description: `Skill regression red flag triggered, motor on track`,
      category: 'mixed_regression',
      child: { dob },
      events,
      groundTruth: { GM: 'no_concern' },
    });
  }

  // Vision/hearing concern profiles
  for (const age of [3, 6, 12]) {
    const dob = dobForAge(age);
    const vhQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'VH',
    ).slice(0, 4);
    const elQuestions = getQuestionsByDomainTag(
      getQuestionsForAgeBand(allQuestions, 0, age), 'EL',
    ).slice(0, 2);

    if (vhQuestions.length < 2) continue;

    const events: { weekOffset: number; questionId: string; answer: 'achieved' | 'not_yet' | 'unsure' }[] = [
      ...vhQuestions.map((q) => ({
        weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, age - 2)),
        questionId: q.id,
        answer: 'not_yet' as const,
      })),
      ...elQuestions.map((q) => ({
        weekOffset: weekOffsetForAge(q.normativeAgeMonths),
        questionId: q.id,
        answer: 'achieved' as const,
      })),
      { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
    ];

    profiles.push({
      id: `vh_concern_${age}m`,
      name: `Vision/hearing concern at ${age} months`,
      description: `VH milestones delayed`,
      category: 'global_delay',
      child: { dob },
      events,
      groundTruth: { VH: 'concern', EL: 'no_concern' },
    });
  }

  // Typical with unsure answers (should NOT trigger concern)
  for (const age of [4, 9, 15, 24]) {
    const dob = dobForAge(age);
    const bandQuestions = getQuestionsForAgeBand(allQuestions, 0, age).slice(0, 5);

    const events: { weekOffset: number; questionId: string; answer: 'achieved' | 'not_yet' | 'unsure' }[] = [
      ...bandQuestions.slice(0, 3).map((q) => ({
        weekOffset: weekOffsetForAge(q.normativeAgeMonths),
        questionId: q.id,
        answer: 'achieved' as const,
      })),
      ...bandQuestions.slice(3).map((q) => ({
        weekOffset: weekOffsetForAge(q.normativeAgeMonths),
        questionId: q.id,
        answer: 'unsure' as const,
      })),
      { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
    ];

    const domains = new Set<DomainTag>();
    for (const q of bandQuestions) {
      for (const tag of q.tags) if (tag !== 'RF') domains.add(tag);
    }
    const groundTruth: Partial<Record<DomainTag, GroundTruthLabel>> = {};
    for (const d of domains) groundTruth[d] = 'no_concern';

    profiles.push({
      id: `typical_unsure_${age}m`,
      name: `Typical with unsure answers at ${age} months`,
      description: `Mix of achieved and unsure, no concern expected`,
      category: 'typical',
      child: { dob },
      events,
      groundTruth,
    });
  }

  // Preterm delay profiles (born early, delayed even on corrected age)
  for (const gestWeeks of [30, 32, 34]) {
    for (const age of [6, 12]) {
      const dob = dobForAge(age);
      const gmQuestions = getQuestionsByDomainTag(
        getQuestionsForAgeBand(allQuestions, 0, age), 'GM',
      ).slice(0, 4);
      const elQuestions = getQuestionsByDomainTag(
        getQuestionsForAgeBand(allQuestions, 0, age), 'EL',
      ).slice(0, 2);

      const events: { weekOffset: number; questionId: string; answer: 'achieved' | 'not_yet' | 'unsure' }[] = [
        ...gmQuestions.map((q) => ({
          weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, age - 2)),
          questionId: q.id,
          answer: 'not_yet' as const,
        })),
        ...elQuestions.map((q) => ({
          weekOffset: weekOffsetForAge(q.normativeAgeMonths),
          questionId: q.id,
          answer: 'achieved' as const,
        })),
        { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
      ];

      profiles.push({
        id: `preterm_delay_${gestWeeks}w_${age}m`,
        name: `Preterm (${gestWeeks}w) motor delay at ${age} months`,
        description: `Born at ${gestWeeks} weeks, GM delayed even on corrected age`,
        category: 'motor_delay',
        child: { dob, gestationalWeeks: gestWeeks },
        events,
        groundTruth: { GM: 'concern', EL: 'no_concern' },
      });
    }
  }

  // Isolated domain delay profiles (single domain, all others on track)
  const isolatedDomains: { tag: DomainTag; name: string }[] = [
    { tag: 'RL', name: 'Receptive Language' },
    { tag: 'SH', name: 'Self-Help' },
  ];
  for (const { tag, name } of isolatedDomains) {
    for (const age of [12, 18, 24]) {
      const dob = dobForAge(age);
      const domainQ = getQuestionsByDomainTag(
        getQuestionsForAgeBand(allQuestions, 0, age), tag,
      ).slice(0, 4);
      const gmQ = getQuestionsByDomainTag(
        getQuestionsForAgeBand(allQuestions, 0, age), 'GM',
      ).slice(0, 3);

      if (domainQ.length < 2) continue;

      const events: { weekOffset: number; questionId: string; answer: 'achieved' | 'not_yet' | 'unsure' }[] = [
        ...domainQ.map((q) => ({
          weekOffset: weekOffsetForAge(Math.max(q.normativeAgeMonths, age - 3)),
          questionId: q.id,
          answer: 'not_yet' as const,
        })),
        ...gmQ.map((q) => ({
          weekOffset: weekOffsetForAge(q.normativeAgeMonths),
          questionId: q.id,
          answer: 'achieved' as const,
        })),
        { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
      ];

      const gt: Partial<Record<DomainTag, GroundTruthLabel>> = { GM: 'no_concern' };
      gt[tag] = 'concern';

      profiles.push({
        id: `isolated_${tag.toLowerCase()}_${age}m`,
        name: `Isolated ${name} delay at ${age} months`,
        description: `Only ${name} delayed, motor on track`,
        category: 'speech_delay',
        child: { dob },
        events,
        groundTruth: gt,
      });
    }
  }

  // Late bloomer profiles (typical but slightly behind, within grace — should be no_concern)
  for (const age of [4, 9, 15, 24]) {
    const dob = dobForAge(age);
    const bandQuestions = getQuestionsForAgeBand(allQuestions, Math.max(0, age - 5), age).slice(0, 4);

    // Answer just past normative but within grace window
    const events: { weekOffset: number; questionId: string; answer: 'achieved' | 'not_yet' | 'unsure' }[] = [
      ...bandQuestions.slice(0, 2).map((q) => ({
        weekOffset: weekOffsetForAge(q.normativeAgeMonths),
        questionId: q.id,
        answer: 'achieved' as const,
      })),
      ...bandQuestions.slice(2).map((q) => ({
        weekOffset: weekOffsetForAge(q.normativeAgeMonths + 0.5), // slightly late but within grace
        questionId: q.id,
        answer: 'achieved' as const,
      })),
      { weekOffset: weekOffsetForAge(age), questionId: 'rf_01', answer: 'achieved' as const },
    ];

    const domains = new Set<DomainTag>();
    for (const q of bandQuestions) {
      for (const tag of q.tags) if (tag !== 'RF') domains.add(tag);
    }
    const groundTruth: Partial<Record<DomainTag, GroundTruthLabel>> = {};
    for (const d of domains) groundTruth[d] = 'no_concern';

    profiles.push({
      id: `late_bloomer_${age}m`,
      name: `Late bloomer at ${age} months`,
      description: `Milestones achieved slightly late but within grace window`,
      category: 'typical',
      child: { dob },
      events,
      groundTruth,
    });
  }

  // Multiple regression events (language + social)
  const multiRegDob = dobForAge(24);
  const multiElQ = getQuestionsByDomainTag(getQuestionsForAgeBand(allQuestions, 0, 24), 'EL').slice(0, 2);
  const multiSeQ = getQuestionsByDomainTag(getQuestionsForAgeBand(allQuestions, 0, 24), 'SE').slice(0, 2);
  if (multiElQ.length >= 2 && multiSeQ.length >= 2) {
    const events: { weekOffset: number; questionId: string; answer: 'achieved' | 'not_yet' | 'unsure' }[] = [
      ...multiElQ.map((q) => ({ weekOffset: weekOffsetForAge(q.normativeAgeMonths), questionId: q.id, answer: 'achieved' as const })),
      ...multiSeQ.map((q) => ({ weekOffset: weekOffsetForAge(q.normativeAgeMonths), questionId: q.id, answer: 'achieved' as const })),
      ...multiElQ.map((q) => ({ weekOffset: weekOffsetForAge(24), questionId: q.id, answer: 'not_yet' as const })),
      ...multiSeQ.map((q) => ({ weekOffset: weekOffsetForAge(24), questionId: q.id, answer: 'not_yet' as const })),
      { weekOffset: weekOffsetForAge(24), questionId: 'rf_01', answer: 'not_yet' as const },
    ];
    profiles.push({
      id: 'multi_regression_el_se_24m',
      name: 'Multi-domain regression at 24 months',
      description: 'Language + social regression at 24 months',
      category: 'mixed_regression',
      child: { dob: multiRegDob },
      events,
      groundTruth: { EL: 'concern', SE: 'concern' },
    });
  }

  return profiles;
}

/**
 * Generate profiles and write to a JSON file.
 */
export function generateProfilesJSON(): string {
  const profiles = generateProfiles();
  return JSON.stringify(profiles, null, 2);
}
