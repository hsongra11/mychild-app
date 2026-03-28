# RBSK Alignment Mapping

## Disclaimer

**Alignment with RBSK does not confer RBSK's validation to this engine.** This document maps the overlap between MyChild Engine's question bank and India's Rashtriya Bal Swasthya Karyakram (RBSK) developmental screening tool for strategic positioning and integration planning purposes only.

## Background

**Rashtriya Bal Swasthya Karyakram (RBSK)** is India's national child health screening program, established in 2013 under the National Health Mission. It screens children from birth to 18 years for 4Ds: Defects at birth, Diseases, Deficiencies, and Developmental Delays.

### RBSK validation status

The RBSK developmental screening tool has been validated against the ASQ-3 gold standard:

- **Sensitivity:** 97.01%
- **Specificity:** 96.43%
- **Positive Predictive Value:** 99.56%
- **Negative Predictive Value:** 79.41%
- **Cohen's Kappa:** 0.854 (substantial agreement)

Source: "Validation of Rashtriya Bal Swasthya Karyakram (RBSK) screening tool in Screening of Developmental Delay (DD) among under 3-year children in Bengaluru" — PMC, 2024.

A separate study validated the Assamese version of the RBSK tool for early detection of developmental delay and autism spectrum disorder (PubMed, 2025).

## Domain mapping

### MyChild Engine domains → RBSK domains

| MyChild Engine Domain | RBSK Equivalent | Coverage |
|---|---|---|
| Gross Motor (GM) | Motor development | Full overlap — both cover head control, sitting, standing, walking |
| Fine Motor (FM) | Motor development (fine) | Partial — RBSK covers basic grasp, MyChild Engine is more granular (pincer, transfer, stacking) |
| Receptive Language (RL) | Language/Communication | Partial — MyChild Engine separates receptive from expressive; RBSK combines them |
| Expressive Language (EL) | Language/Communication | Partial — same as above |
| Social-Emotional (SE) | Social/Personal | Good overlap — both cover social responsiveness, attachment, play |
| Cognitive / Play (CP) | Cognitive | Partial — MyChild Engine covers problem-solving and object permanence; RBSK is less granular |
| Self-Help / Adaptive (SH) | Personal/Adaptive | Partial — feeding, dressing, toileting covered by both |
| Vision / Hearing (VH) | Sensory screening | Partial — RBSK has separate vision/hearing screening protocols; MyChild Engine embeds sensory items within milestone questions |

### Key differences

| Aspect | MyChild Engine | RBSK |
|---|---|---|
| Age range | 0–36 months | 0–6 years |
| Question count | 131 | ~30 screening items (0–3 years) |
| Scoring | Evidence-weighted severity with grace windows | Pass/fail with referral threshold |
| Granularity | 8 separate domains | 4 broad categories |
| Evidence weights | L/M/H/RF weight classes adjusting grace windows | Binary (concern/no concern) |
| Probe library | P1–P5 clarifiers to reduce false positives | Limited follow-up guidance |
| Regression detection | Automatic achieved→not_yet pattern detection | Manual clinician judgment |
| Corrected age | Automatic for preterm (<37 weeks) until 24 months | Clinician-directed |

### Gap analysis

**Items in MyChild Engine not in RBSK (value-add):**
- Evidence-weighted escalation with configurable thresholds
- Probe-based false positive reduction (5 probe types)
- Automated regression detection
- Corrected age for preterm infants
- Per-domain confidence scoring with evidence sufficiency gates
- Streak-based escalation within domains
- Rule simulator for threshold calibration

**Items in RBSK not in MyChild Engine:**
- Age range 3–6 years (MyChild stops at 36 months)
- Integration with India's health infrastructure (ABDM, Poshan Tracker)
- Trained health worker administration protocol
- Referral pathway to District Early Intervention Centres (DEICs)
- Screening for 4Ds beyond developmental delays (defects, diseases, deficiencies)

## Integration opportunities

### India Health Stack

1. **ABDM (Ayushman Bharat Digital Mission):** MyChild Engine outputs could feed into ABHA health records as structured developmental screening data
2. **Poshan Tracker:** Integration with the nutrition tracking system for combined growth + developmental monitoring
3. **RBSK Portal (rbsk.mohfw.gov.in):** MyChild Engine could serve as the digital scoring engine behind RBSK's paper-based screening, adding evidence-weighted escalation to the existing program

### For institutional partners (RNF, Murthy Foundation, Rainmatter)

- MyChild Engine provides the **digital infrastructure** that RBSK's paper-based screening lacks
- The engine's granularity (8 domains vs 4 categories) provides **richer developmental data** for research
- The built-in validation pipeline enables **reproducible research** on screening thresholds
- Multilingual support (Hindi skeleton, Kannada/Tamil/Telugu planned) aligns with India's linguistic diversity

## References

1. RBSK Portal — National Health Mission: https://rbsk.mohfw.gov.in/RBSK/
2. "Validation of RBSK screening tool in Bengaluru" — PMC, 2024
3. "Validation of Assamese Version of RBSK Tool" — PubMed, 2025
4. National Health Mission RBSK page: https://nhm.gov.in/index4.php?lang=1&level=0&linkid=499&lid=773
