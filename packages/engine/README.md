# mychild-engine

[![npm version](https://img.shields.io/npm/v/mychild-engine)](https://www.npmjs.com/package/mychild-engine)
[![npm downloads](https://img.shields.io/npm/dm/mychild-engine)](https://www.npmjs.com/package/mychild-engine)

Developmental screening engine for children 0-36 months. Tracks milestones, flags delays, and tells caregivers what to do next.

Install from npm: [`mychild-engine`](https://www.npmjs.com/package/mychild-engine)

Zero dependencies. Runs anywhere JavaScript runs. Built from a decade of work on [My Child App](https://mychildapp.in), which has screened children in 100+ countries.

> **Not a diagnostic tool.** This engine helps caregivers notice developmental changes early. It cannot diagnose. If you're worried about your child, talk to their doctor.

## Install

```bash
npm install mychild-engine
```

## What it does

You give it a child's date of birth and their caregiver's answers to age-appropriate milestone questions. It gives you back:

- **Per-question severity** (normal, precaution, warning, flag) based on the child's corrected age relative to normative milestones
- **Domain assessments** across 8 developmental areas with evidence sufficiency gates
- **A global status** (green/yellow/orange/red) summarizing overall development
- **Prioritized next actions** (recheck, coaching, clinician discussion, specialist referral)
- **Plain-English explanations** for every severity decision

The engine handles corrected age for preterm infants, re-check scheduling, and knows when it doesn't have enough data to make a call.

## Quick start

```typescript
import { evaluate, computeChildAge, getDueQuestions } from 'mychild-engine';

// 7-month-old child
const child = { dob: new Date('2025-09-01') };

// What's their age?
const age = computeChildAge(child.dob);
console.log(`${age.chronologicalMonths.toFixed(1)} months old`);

// Which questions should we ask right now?
const questions = getDueQuestions(child, []);
console.log(`${questions.length} questions due`);

// Evaluate with some answers
const result = evaluate(child, [
  { questionId: questions[0].id, answer: 'achieved', timestamp: new Date() },
  { questionId: questions[1].id, answer: 'not_yet', timestamp: new Date() },
]);

console.log(result.globalStatus);       // { level: 'green', message: '...' }
console.log(result.domains);            // per-domain assessments
console.log(result.nextActions);        // what to do next
```

## API

### `evaluate(child, answers, ruleset?)`

The main function. Runs the full screening pipeline:

1. Computes the child's chronological and corrected age
2. Gathers age-appropriate questions plus universal red flags
3. Evaluates each answered question through the rules engine
4. Scores all 8 developmental domains
5. Derives a global status
6. Generates prioritized next actions

Returns a `ScreeningResult` with everything you need to render a results screen.

### `getDueQuestions(child, answers, ruleset?)`

Returns questions the caregiver should answer right now. Filters out achieved milestones, respects re-check intervals, and always includes universal red flags. Handles the scheduling logic so you don't have to.

### `computeChildAge(dob, gestationalWeeks?)`

Returns chronological and corrected age in days, weeks, and months. For preterm infants (<37 weeks gestational), corrected age is used automatically until 24 months.

### `simulate(ruleset, trajectories, baselineRuleset?)`

Replay synthetic child timelines through the engine. Feed it a sequence of answers at different week offsets and see how severity and domain status evolve. Pass two rulesets to generate diffs showing how threshold changes affect alert timing.

### `explain(result, questionId)`

Returns a detailed breakdown of why a specific question got its severity: which input factors were considered, which rule fired, why the child's age matters, and what to do next.

## How it works

### Severity model

Each answered question gets a severity based on the child's corrected age relative to the milestone's normative age:

| Severity | Meaning |
|---|---|
| **normal** | Milestone achieved, or child is still within the expected window |
| **precaution** | Child is past the normative age but within the grace period |
| **warning** | Child is past the grace period by up to 1 month |
| **flag** | Child is past the grace period by 1+ months, or a red-flag item was answered "not yet" |

Grace periods are age-dependent: 4 weeks for infants under 12 months, 6 weeks for toddlers.

### Domain scoring

Eight developmental domains, each scored independently:

| Tag | Domain |
|---|---|
| GM | Gross Motor |
| FM | Fine Motor |
| RL | Receptive Language |
| EL | Expressive Language |
| SE | Social-Emotional |
| CP | Cognitive / Play |
| SH | Self-Help / Adaptive |
| VH | Vision / Hearing |

Each domain maintains a vector tracking flags, warnings, precautions, consecutive missed milestones, and confidence level. An evidence sufficiency gate prevents the engine from escalating to "high concern" without at least 2 independent observations in that domain.

### Action profiles

Seven response pathways, each tuned for the type of milestone:

- **AP-STD** -- standard monitoring (most milestones)
- **AP-LANG** -- language (recommends validated screening at key ages)
- **AP-MOTOR** -- motor (clinician discussion for persistent delays)
- **AP-SENS** -- sensory (earlier escalation, hearing/vision checks)
- **AP-RF** -- red flags (regression triggers urgent referral)
- **AP-ADAPT** -- adaptive/self-help (gentler escalation)
- **AP-TOILET** -- toilet readiness (reassurance, no pressure)

### Question bank

129 caregiver-facing questions across 10 age bands from birth to 36 months, plus 5 universal red flags. Each question carries:

- Plain-language wording observable by a caregiver
- Domain tags
- Evidence strength (High/Moderate/Low)
- Weight class (L/M/H/RF) controlling escalation speed
- Probe references for follow-up clarification
- An action profile defining the response pathway

The questions are sourced from publicly available CDC milestone checklists. They are not copyrighted instruments and should not be used as substitutes for validated tools like ASQ-3 or M-CHAT-R/F.

## Preterm support

For children born before 37 weeks, pass `gestationalWeeks` and the engine handles the rest:

```typescript
const child = {
  dob: new Date('2026-01-15'),
  gestationalWeeks: 32, // born 8 weeks early
};

// All evaluations automatically use corrected age until 24 months
const result = evaluate(child, answers);
```

## Custom rulesets

Every threshold is configurable. The default ruleset (`DEFAULT_RULESET`) ships with hypothesis-level thresholds that have not been clinically validated.

```typescript
import { evaluate, DEFAULT_RULESET, type Ruleset } from 'mychild-engine';

const custom: Ruleset = {
  ...DEFAULT_RULESET,
  thresholds: { T_yellow: 2, T_orange: 5, T_red: 7 },
  graceWeeks: { infant: 5, toddler: 8 },
};

const result = evaluate(child, answers, custom);
```

Use the simulator to test how ruleset changes affect alert timing before deploying them.

## Clinical validation status

All thresholds are **hypothesis-level** (Ruleset v0.1). They are derived from CDC milestone checklists, AAP-referenced evidence, and the founders' clinical research. They have not undergone formal sensitivity/specificity analysis or clinical trials.

If you're a clinician or researcher interested in validation, contributions are welcome. Open an issue on the [GitHub repo](https://github.com/hsongra11/mychild-app).

## Data privacy

The engine runs entirely locally. No network calls, no telemetry, no data collection. If you build on top of it, you're responsible for your own privacy compliance (COPPA, GDPR, HIPAA, etc).

## License

Engine code: Apache-2.0. Question bank data: CC BY-SA 4.0.

## Founders

Built by [Harsh Songra](https://harshsongra.com) and [Aafreen Ansari](https://linkedin.com/in/aafreen-ansari-8a4265112).

Harsh was diagnosed with dyspraxia at 11 after 9 years of misdiagnosis. He built the first version of My Child App at 18 to make sure other families didn't lose those years. The app screened children in 100+ countries. The startup ran its course. The problem didn't go away. Ten years later, the core screening logic is being open-sourced.
