# My Child Engine

[![npm version](https://img.shields.io/npm/v/mychild-engine)](https://www.npmjs.com/package/mychild-engine)
[![npm downloads](https://img.shields.io/npm/dm/mychild-engine)](https://www.npmjs.com/package/mychild-engine)

Open-source developmental screening engine for children 0-36 months. Created by [Harsh Songra](https://harshsongra.com) and [Aafreen Ansari](https://linkedin.com/in/aafreen-ansari-8a4265112).

Install from npm: [`mychild-engine`](https://www.npmjs.com/package/mychild-engine)

> **This is NOT a diagnostic tool.** This software tracks developmental milestones and helps caregivers notice changes early. It cannot diagnose any medical condition, developmental disorder, or disability. If you have concerns about your child's development, please consult a qualified healthcare professional immediately.

## Disclaimers

### Medical Disclaimer

This software is provided for **informational and educational purposes only**. It is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Never disregard professional medical advice or delay seeking it because of something produced by this software.

- This engine does **not** perform medical diagnosis of any kind
- All severity outputs (precaution, warning, flag) are **screening signals**, not clinical determinations
- All thresholds are labeled **"Ruleset v0.1 (hypothesis)"** and have **not been validated through clinical trials**
- The question bank is based on publicly available CDC milestone checklists and founder clinical research, **not** on copyrighted validated instruments (ASQ-3, M-CHAT-R/F, Denver)
- No output from this engine should be interpreted as medical advice

### Intended Use

This engine is designed for:
- Developmental **monitoring and surveillance** (helping caregivers track milestones over time)
- **Triage to screening and referral** (suggesting when to talk to a doctor, not what the doctor should do)
- **Research and development** of screening tools by qualified developers and clinicians
- **Educational purposes** (understanding how developmental screening logic works)

This engine is **NOT** designed for:
- Clinical decision-making
- Replacing validated screening instruments (ASQ-3, M-CHAT-R/F)
- Standalone use without professional guidance in clinical settings
- Any use where outputs could be interpreted as medical diagnosis

### Liability

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. The authors and contributors are not liable for any decisions made based on the outputs of this engine. See the [LICENSE](LICENSE) file for full terms.

### Data Privacy

The engine runs entirely locally. No child data is transmitted to any server. The demo app stores answers in browser localStorage only. If you build on top of this engine, you are responsible for compliance with applicable privacy regulations (COPPA, GDPR, DPDP Act, HIPAA, etc.) in your jurisdiction.

### Copyrighted Instruments

This project does **not** reproduce or distribute any copyrighted screening instruments. The question bank is derived from publicly available CDC milestone checklists (which are not copyrighted screening tools and should not be used as substitutes for validated instruments). If you intend to integrate validated instruments like ASQ-3 or M-CHAT-R/F into a product built on this engine, you must obtain appropriate licenses from the rights holders.

---

## What this is

An evidence-weighted rules engine for developmental milestone screening. It sits in the gap between free CDC checklists (simple checkboxes) and licensed clinical instruments (ASQ-3, M-CHAT-R/F).

Features:
- **129 caregiver-facing questions** across 10 age bands (birth to 36 months)
- **8 developmental domains**: Gross Motor, Fine Motor, Receptive Language, Expressive Language, Social-Emotional, Cognitive, Self-Help/Adaptive, Vision/Hearing
- **Evidence-weighted escalation**: questions carry weight classes (Low/Medium/High/Red-Flag) that determine escalation speed
- **Domain scoring with sufficiency gates**: won't flag "high concern" without enough independent observations
- **Corrected age for preterm infants**: automatic adjustment until 24 months
- **Probe library**: follow-up clarifiers (P1-P5) that reduce false positives
- **Rule simulator**: replay synthetic child timelines against different threshold settings and see alert diffs
- **Explainability**: every severity output includes plain-English "why" traces

## Quick start

```bash
npm install mychild-engine
```

```typescript
import { evaluate, computeChildAge, getDueQuestions } from 'mychild-engine';

// Create a child (7 months old)
const child = { dob: new Date('2025-09-01') };

// Get age info
const age = computeChildAge(child.dob);
console.log(`${age.chronologicalMonths.toFixed(1)} months old`);

// Get due questions
const questions = getDueQuestions(child, []);
console.log(`${questions.length} questions due`);

// Evaluate with some answers
const result = evaluate(child, [
  { questionId: questions[0].id, answer: 'achieved', timestamp: new Date() },
  { questionId: questions[1].id, answer: 'not_yet', timestamp: new Date() },
]);

console.log(result.globalStatus.message);
console.log(result.nextActions);
```

## Project structure

```
packages/engine/     # mychild-engine - the standalone TypeScript engine
  src/               # Engine source code (11 modules)
  data/              # Question bank JSON (129 questions, the core IP)
  dist/              # Compiled output

apps/demo/           # Next.js 16 + shadcn/ui one-page demo
  src/app/           # App router pages + server actions
  src/components/    # Client components (screening, results, simulator)

docs/                # Reference documents (question bank PDF, threshold worksheets)
```

## Engine API

### `evaluate(child, answers, ruleset?)`
Run the full screening evaluation. Returns per-question severity, domain assessments, global status, and recommended next actions.

### `computeChildAge(dob, gestationalWeeks?)`
Compute chronological and corrected age. Corrected age applies for preterm infants (<37 weeks) until 24 months chronological.

### `getDueQuestions(child, answers, ruleset?)`
Get age-appropriate questions that are due for the child. Filters out achieved milestones and respects re-check intervals.

### `simulate(ruleset, trajectories, baselineRuleset?)`
Run synthetic child timelines through the engine. If a baseline ruleset is provided, generates diffs showing how threshold changes affect alerts.

### `explain(result, questionId)`
Get a detailed explanation of why a specific severity was assigned, including input factors, applied rule, and recommended action.

## Engine architecture

### Severity model
For each answered question, the engine computes severity based on the child's corrected age relative to the milestone's normative age:
- **Normal**: milestone achieved, or child is within the expected age window
- **Precaution**: child is beyond the normative age but within the grace period
- **Warning**: child is beyond the grace period by 1 month
- **Flag**: child is beyond the grace period by 2+ months

### Domain scoring
Each of the 8 developmental domains maintains a vector: `flag_count`, `warning_count`, `precaution_count`, `streak_missed`, `critical_milestone_missed`, and `confidence`. Domain status is derived from this vector with an evidence sufficiency gate (requires >= 2 independent observations before escalating beyond "watch").

### Evidence weights
Questions carry weight classes (L/M/H/RF) that affect escalation speed. Low-weight items require corroboration before escalating. High-weight items can escalate with fewer observations. Red-flag items (regression) trigger immediate urgent pathways.

### Action profiles
Seven action profiles define response pathways per milestone category:
- **AP-STD**: standard monitoring (most milestones)
- **AP-LANG**: language pathway (recommends validated screening at 9/18/30 months)
- **AP-MOTOR**: motor pathway (clinician discussion for persistent delays)
- **AP-SENS**: sensory pathway (earlier escalation, hearing/vision checks)
- **AP-RF**: red-flag pathway (regression triggers urgent referral)
- **AP-ADAPT**: adaptive/self-help (gentler escalation)
- **AP-TOILET**: toilet readiness (reassurance, no pressure)

## Question bank

The question bank at `packages/engine/data/question-bank.json` contains 129 questions sourced from publicly available CDC milestone checklists (2 months through 3 years). Each question includes:

- Caregiver-facing wording (plain language, parent-observable)
- Domain tags (which developmental areas it assesses)
- Evidence strength rating (High/Moderate/Low)
- Weight class (L/M/H/RF) for escalation speed
- Probe references (P1-P5 clarifiers to reduce false positives)
- Action profile (response pathway per answer state)

### Age bands
| Band | Age Range | Questions |
|------|-----------|-----------|
| 0-2 months | 0-10 weeks | 10 |
| 3-5 months | 12-22 weeks | 13 |
| 6-8 months | 24-36 weeks | 12 |
| 9-11 months | 38-48 weeks | 13 |
| 12-14 months | 52-64 weeks | 8 |
| 15-17 months | 65-78 weeks | 13 |
| 18-20 months | 79-90 weeks | 15 |
| 21-23 months | 91-104 weeks | 13 |
| 24-29 months | 105-130 weeks | 14 |
| 30-36 months | 131-156 weeks | 13 |
| Universal red flags | All ages | 5 |

## Clinical validation status

All thresholds in this engine are **hypothesis-level** (Ruleset v0.1). They are derived from:
- CDC "Learn the Signs. Act Early." milestone checklists (publicly available, not copyrighted screening tools)
- AAP-referenced evidence on milestone timing
- Founder clinical research and domain expertise

They have **not** undergone:
- Retrospective simulation against clinical datasets
- Prospective pilot with clinical adjudication
- Formal sensitivity/specificity analysis
- Regulatory review of any kind

If you are a clinician or researcher interested in validating these thresholds, please open an issue. Contributions from the clinical community are welcome and encouraged.

## Running the demo

```bash
git clone <this-repo>
cd mychild-engine
npm install
npm run build --workspace=packages/engine
npm run dev --workspace=apps/demo
```

Open http://localhost:3000 to see the demo.

The demo includes:
- **Screening tab**: enter child DOB, answer age-appropriate milestone questions, see real-time severity badges
- **Results tab**: domain status cards across 8 developmental domains, global status, recommended actions
- **Simulator tab**: replay 3 built-in trajectories (normal development, speech delay, motor concern with regression), tune thresholds with sliders, compare alert diffs

## Publishing `mychild-engine`

Run releases from the repo root:

```bash
npm run release:engine:check
npm run release:engine:version:patch
npm run release:engine:publish
```

Notes:
- `release:engine:check` runs lint, tests, and `npm pack --dry-run` for the engine workspace.
- `release:engine:version:patch` creates the npm version bump for `packages/engine`. Use `release:engine:version:minor` or `release:engine:version:major` when needed.
- `release:engine:publish` publishes `mychild-engine` with `--access public`.
- Make sure you are logged into npm before publishing.

## Contributing

Contributions are welcome, especially from:
- **Clinicians**: threshold validation, question bank review, clinical accuracy
- **Developers**: engine improvements, test coverage, additional integrations
- **Translators**: multi-language question bank adaptations
- **Researchers**: retrospective analysis, sensitivity/specificity studies

Please open an issue before submitting large PRs.

## License

- **Engine code**: Apache-2.0
- **Question bank data**: CC BY-SA 4.0

See [LICENSE](LICENSE) for full terms.

## Founders

**Harsh Songra** — Forbes 30 Under 30 (India & Asia), TEDx speaker, World Economic Forum Agenda Contributor. Diagnosed with dyspraxia at age 11 after 9 years of misdiagnosis. Built the first version of MyChild App at 18. [Website](https://harshsongra.com) | [TED Talk](https://www.ted.com/talks/harsh_songra_why_do_we_fail_to_understand_people_with_disabilities)

**Aafreen Ansari** — Forbes 30 Under 30 (Asia), TED speaker, co-founder of We, Included. Dropped out of college at 19 to co-found MyChild App. Led product development and raised seed funding from 500 Startups and Singapore Angel Network. [LinkedIn](https://linkedin.com/in/aafreen-ansari-8a4265112)

MyChild App raised $100K in seed funding from 500 Startups and angel investors including Samir Bangara, Pallav Nadhani, and Singapore Angel Network. The startup ran its course. The problem didn't go away. 10 years later, the core technology is being open-sourced.

## Acknowledgments

- CDC "Learn the Signs. Act Early." program for publicly available milestone checklists
- AAP developmental screening guidelines
- The original My Child App team and early users who informed the question bank design
