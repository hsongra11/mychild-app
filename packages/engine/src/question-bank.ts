import * as fs from 'fs';
import * as path from 'path';
import type { Question, DomainTag, ActionProfileType, EscalationRule, EvidenceStrength, WeightClass } from './types.js';

// ---------------------------------------------------------------------------
// Raw JSON shape (mirrors question-bank.json exactly)
// ---------------------------------------------------------------------------

interface RawQuestion {
  id: string;
  text: string;
  subtext: string | null;
  tags: string[];
  askWindow: { minMonths: number; maxMonths: number };
  normativeAgeMonths: number | null;
  evidenceStrength: string;
  weight: string;
  escalationRule: string;
  escalationCondition: string | null;
  probes: string[];
  actionProfile: string;
  activityId: string | null;
  notes: string;
}

interface RawAgeBand {
  id: string;
  label: string;
  ageRangeWeeks: { min: number; max: number };
  ageRangeMonths: { min: number; max: number };
  questions: RawQuestion[];
}

interface RawBank {
  version: string;
  source: string;
  clinicalStatus: string;
  universalRedFlags: RawQuestion[];
  ageBands: RawAgeBand[];
}

// ---------------------------------------------------------------------------
// Load the JSON data
// ---------------------------------------------------------------------------

function loadBankData(): RawBank {
  // __dirname is always available in CJS output (NodeNext without "type":"module")
  const dataPath = path.resolve(__dirname, '..', 'data', 'question-bank.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw) as RawBank;
}

const bankData: RawBank = loadBankData();

// ---------------------------------------------------------------------------
// Coerce raw JSON into typed Question objects
// ---------------------------------------------------------------------------

function normalizeActionProfile(raw: string): ActionProfileType {
  // Some questions in the JSON have composite strings like "AP-STD / AP-LANG".
  // We take the first listed profile as the primary.
  const first = raw.split('/')[0].trim();
  const valid: ActionProfileType[] = [
    'AP-STD',
    'AP-LANG',
    'AP-MOTOR',
    'AP-SENS',
    'AP-RF',
    'AP-ADAPT',
    'AP-TOILET',
  ];
  return (valid.includes(first as ActionProfileType) ? first : 'AP-STD') as ActionProfileType;
}

function toQuestion(raw: RawQuestion): Question {
  return {
    id: raw.id,
    text: raw.text,
    subtext: raw.subtext ?? undefined,
    tags: raw.tags as DomainTag[],
    askWindow: raw.askWindow,
    // Red-flag questions have null normativeAgeMonths; fall back to 0
    normativeAgeMonths: raw.normativeAgeMonths ?? 0,
    evidenceStrength: raw.evidenceStrength as EvidenceStrength,
    weight: raw.weight as WeightClass,
    escalationRule: raw.escalationRule as EscalationRule,
    escalationCondition: raw.escalationCondition ?? '',
    probes: raw.probes,
    actionProfile: normalizeActionProfile(raw.actionProfile),
    activityId: raw.activityId,
    notes: raw.notes,
  };
}

// ---------------------------------------------------------------------------
// Build the flat arrays once at module load time
// ---------------------------------------------------------------------------

const UNIVERSAL_RED_FLAGS: Question[] = bankData.universalRedFlags.map(toQuestion);

const AGE_BAND_QUESTIONS: Question[] = bankData.ageBands.flatMap((band) =>
  band.questions.map(toQuestion),
);

const ALL_QUESTIONS: Question[] = [...UNIVERSAL_RED_FLAGS, ...AGE_BAND_QUESTIONS];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Return every question in the bank (universal red flags + all age bands). */
export function getAllQuestions(): Question[] {
  return ALL_QUESTIONS;
}

/** Look up a single question by ID. Returns undefined if not found. */
export function getQuestionById(id: string): Question | undefined {
  return ALL_QUESTIONS.find((q) => q.id === id);
}

/**
 * Return all questions whose askWindow overlaps with the given age range.
 * Both minMonths and maxMonths are inclusive.
 */
export function getQuestionsByAgeBand(minMonths: number, maxMonths: number): Question[] {
  return ALL_QUESTIONS.filter(
    (q) =>
      q.askWindow.minMonths <= maxMonths && q.askWindow.maxMonths >= minMonths,
  );
}

/** Return the five universal red-flag questions (always asked 0–36 months). */
export function getUniversalRedFlags(): Question[] {
  return UNIVERSAL_RED_FLAGS;
}

/**
 * Return all questions that include the given domain tag.
 * A question may belong to multiple domains.
 */
export function getQuestionsByDomain(tag: DomainTag): Question[] {
  return ALL_QUESTIONS.filter((q) => q.tags.includes(tag));
}

// Also export the raw collections for consumers who want direct access
export { UNIVERSAL_RED_FLAGS, AGE_BAND_QUESTIONS, ALL_QUESTIONS };
