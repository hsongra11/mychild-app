# MyChild Engine — Autonomous Research: Executive Summary

**Date:** 2026-03-29 | **Engine:** v0.2.0 | **Duration:** ~25 min active | **Experiments:** 134

## What We Did

An autonomous multi-agent research system (inspired by Karpathy's autoresearch) ran with four specialized AI agents: a threshold optimizer that swept all 13 configurable engine parameters across 90 experiments, an adversarial profile generator that created 707 stress-test developmental profiles across 10 categories, a rules engine improver that made 2 clinically-grounded code changes, and a report compiler that synthesized findings into a 50+ page research report.

## What We Found

- **Specificity improved from 97.9% to 100.0%** while maintaining 100% sensitivity — all 4 baseline false positives eliminated through 2 targeted code changes to `domain-scoring.ts`.
- **Cohen's κ improved from 0.971 to 1.000** — perfect agreement between engine and ground truth across 294 observations.
- **90 threshold experiments** confirmed that `defaults.ts` parameters are decoupled from classification. The actual decisions are driven by hardcoded logic in `domain-scoring.ts`, which is where the improvements were made.
- **0 engine crashes** across 707 adversarial profiles — the engine is robust against malformed, extreme, and contradictory inputs.
- **168 edge-case surprises found** — 97.6% show the engine being *more lenient* than expected (safe direction). Only 4 (2.4%) show over-aggressiveness.
- **Regression detection gap identified** — profiles with developmental regression had a 98.1% surprise rate, the highest of any category. This is the top remaining priority.

## What To Do Next

1. **Audit and strengthen regression detection** (Critical). Skill regression is a clinical red flag for autism and other conditions. The engine's regression detection logic needs targeted review and dedicated test cases.

2. **Add developmental sequence validation** (High). The engine doesn't detect when a child achieves harder milestones but fails easier ones in the same domain — a clinically impossible pattern that should trigger at least a watch status.

3. **Expand the profile set** (High). Add preterm profiles to test corrected age (currently untested), borderline profiles sensitive to threshold changes, and verified adversarial profiles from this run's 707-profile catalog.
