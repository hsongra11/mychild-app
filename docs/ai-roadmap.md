# AI Integration Roadmap for MyChild Engine

## Preamble

The current engine (v0.2) is a **rule-based system with evidence-weighted escalation.** This is by design — rule-based systems are explainable, auditable, and clinically trustworthy. AI integration should **augment** this foundation, not replace it.

Each opportunity below includes: what it does for the user, how it would work technically, what data it needs, how to validate it, and what the risks are.

---

## 1. Adaptive Question Ordering

### What it does
Instead of presenting all age-appropriate questions at once, an ML model selects the next question based on the child's prior answers. This reduces caregiver burden (fewer questions per session) while maintaining screening sensitivity.

### Technical approach
- **Model:** Lightweight decision tree or logistic regression trained on the relationship between early answers and downstream domain status
- **Input:** Current answer vector (which questions answered, what the answers were)
- **Output:** Ranked list of remaining questions by information gain
- **Integration point:** New `getAdaptiveQuestions()` function alongside existing `getDueQuestions()`

### Data requirements
- Training data: Completed screening sessions (all questions answered) to learn which early answers predict domain-level outcomes
- Minimum viable: 500+ completed sessions across the age range
- Synthetic data can bootstrap initial models; real-world data refines

### Validation methodology
1. Run the internal consistency validation with and without adaptive ordering
2. Measure: Does reducing the question count from N to N/2 maintain sensitivity above 85%?
3. Compare: Which questions are most predictive per age band? Does the ML ordering match clinical intuition?
4. A/B test: Caregiver completion rates with adaptive vs full question sets

### Risk assessment
- **Risk:** Information gain optimization might skip questions that are rare but clinically important (e.g., regression detection)
- **Mitigation:** Red flag questions (rf_01–rf_05) are ALWAYS asked regardless of adaptive ordering
- **Risk:** Model drift as real-world demographics differ from training data
- **Mitigation:** Monitor per-domain sensitivity quarterly; retrain when it drops below threshold

---

## 2. NLP Probe Analysis

### What it does
When a caregiver responds to a probe question (P1–P5), they often give free-text answers ("he does it sometimes but only when he's in a good mood"). An LLM interprets this text and determines whether the milestone should be classified as achieved, not_yet, or unsure — reducing false positives from misunderstood questions.

### Technical approach
- **Model:** LLM (Claude or similar) with a structured prompt
- **Input:** The milestone question, the probe question, and the caregiver's free-text response
- **Output:** Structured classification: `{classification: 'achieved' | 'not_yet' | 'unsure', confidence: number, reasoning: string}`
- **Integration point:** New `analyzeProbeResponse()` function that feeds back into the answer pipeline
- **Key constraint:** The LLM output is a SUGGESTION to the caregiver, not an override. The caregiver confirms.

### Data requirements
- No training data needed (zero-shot LLM capability)
- Prompt engineering with 20–30 example probe responses per probe type
- Evaluation set: 200+ labeled probe responses for accuracy measurement

### Validation methodology
1. Collect probe responses (can be synthetic initially, real-world later)
2. Have the LLM classify each one
3. Compare against human clinician labels
4. Measure: Agreement rate, false negative rate (LLM says achieved but clinician says not_yet)
5. Focus on: Does NLP probe analysis reduce false positives without increasing false negatives?

### Risk assessment
- **Risk:** LLM hallucination — classifying a genuine concern as "achieved" based on ambiguous text
- **Mitigation:** Default to the more conservative classification when confidence is low; always require caregiver confirmation
- **Risk:** Language/cultural bias — LLM may misinterpret responses from non-English or culturally different caregivers
- **Mitigation:** Include diverse example responses in the prompt; validate separately per language
- **Risk:** Privacy — caregiver free-text responses sent to an LLM API
- **Mitigation:** On-device models (e.g., Apple Intelligence, Chrome AI) or self-hosted models for sensitive contexts

---

## 3. Longitudinal Pattern Recognition

### What it does
The current engine detects regression via a simple achieved→not_yet pattern check. ML-based pattern recognition can detect subtler patterns: gradual skill plateau, inconsistent performance across sessions, or domain-specific velocity changes that precede regression.

### Technical approach
- **Model:** Time series analysis (LSTM or transformer) on per-child answer histories
- **Input:** Sequence of answer events over time, per domain
- **Output:** Risk score for developmental plateau or impending regression
- **Integration point:** New `analyzeTrajectory()` function that adds a risk overlay to domain scoring

### Data requirements
- Training data: Longitudinal answer histories (3+ sessions per child, 100+ children)
- This is the HARDEST data to obtain — requires real-world deployment
- Synthetic trajectories can model known patterns but cannot capture the full diversity of real developmental trajectories

### Validation methodology
1. Define "ground truth" regression events from clinical datasets (if available)
2. Train model on synthetic trajectories with known regression patterns
3. Measure: Does the model detect regression earlier than the rule-based check?
4. Clinical review: Show flagged trajectories to pediatricians and measure agreement

### Risk assessment
- **Risk:** False alarms — flagging normal developmental variation as regression risk
- **Mitigation:** High confidence threshold; present as "pattern worth monitoring" not "regression detected"
- **Risk:** Insufficient training data — model overfits to synthetic patterns
- **Mitigation:** Start rule-based, transition to ML only when real-world data is sufficient
- **Risk:** This is the most complex integration — consider it Phase 3 at earliest

---

## 4. Intelligent Text-to-Speech

### What it does
Replace the mechanical Web Speech API voices with AI-powered voices that sound natural and culturally appropriate for Indian languages. Critical for low-literacy populations who interact with the app primarily through audio.

### Technical approach
- **Service:** AI TTS providers (Google Cloud TTS, Azure Neural TTS, or open-source models like Piper/Coqui)
- **Languages:** Hindi (hi-IN), Kannada (kn-IN), Tamil (ta-IN), Telugu (te-IN), English (en-IN)
- **Integration point:** Replace `WebSpeechTTSProvider` with `AITTSProvider` that uses a cloud or on-device AI voice model
- **Key feature:** Tone-appropriate delivery — questions about development concerns should sound warm and supportive, not clinical

### Data requirements
- No training data needed for cloud TTS (pre-trained models)
- For custom voices: 2–5 hours of recorded speech per language from a native speaker with an appropriate tone
- Evaluation: Caregiver preference testing (does the AI voice feel more trustworthy than the mechanical voice?)

### Validation methodology
1. A/B test: Same question set delivered with mechanical vs AI voice
2. Measure: Completion rates, time to answer, caregiver satisfaction score
3. Qualitative: Focus group feedback on voice naturalness and trust

### Risk assessment
- **Risk:** Cloud TTS adds network dependency and cost
- **Mitigation:** Offer fallback to Web Speech API; cache frequently used phrases
- **Risk:** Cultural sensitivity — voice that sounds "wrong" for the language or context
- **Mitigation:** Native speaker review of all generated audio before deployment
- **Risk:** Lowest clinical impact of all four AI integrations — this is a UX improvement, not a screening improvement
- **Mitigation:** Deprioritize behind items 1–3 unless user research shows voice quality is a barrier to adoption

---

## Priority order

| # | Integration | Impact | Difficulty | Data Need | Suggested Phase |
|---|---|---|---|---|---|
| 1 | Adaptive Question Ordering | High | Medium | Medium (500+ sessions) | Phase 2 |
| 2 | NLP Probe Analysis | Medium | Low | Low (zero-shot) | Phase 2 |
| 3 | Longitudinal Pattern Recognition | High | High | High (longitudinal data) | Phase 3 |
| 4 | Intelligent TTS | Low (UX only) | Low | None | Phase 2 |

Phase 1 = current plan (evidence-based engine, validation pipeline)
Phase 2 = post-validation, with initial real-world deployment data
Phase 3 = with sufficient longitudinal data from real-world use
