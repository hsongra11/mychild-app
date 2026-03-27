/**
 * Probe definitions used to clarify uncertain ("unsure") answers.
 *
 * Probes are referenced by ID in the question bank (e.g. ["P1", "P3"]).
 * They are presented to caregivers when the engine suggests follow-up
 * questions to improve response quality.
 */

export interface ProbeDefinition {
  id: string;
  shortLabel: string;
  question: string;
  purpose: string;
}

export const PROBE_DEFINITIONS: Record<string, ProbeDefinition> = {
  P1: {
    id: 'P1',
    shortLabel: 'Opportunity to observe',
    question: 'Has your child had a chance to try this?',
    purpose:
      'Confirms whether the caregiver has actually had an opportunity to observe the behaviour. Absence of opportunity should be treated as "unsure" rather than "not yet".',
  },
  P2: {
    id: 'P2',
    shortLabel: 'Frequency window',
    question: 'Have you seen this at least once in the last 7 days?',
    purpose:
      'Anchors the report to a recent, specific observation window to reduce recall bias and over-generalisation from isolated incidents.',
  },
  P3: {
    id: 'P3',
    shortLabel: 'Concrete example',
    question: 'Can you tell me one small example of what your child did?',
    purpose:
      'Elicits a specific behavioural description that allows clinicians to judge whether the reported behaviour genuinely matches the milestone.',
  },
  P4: {
    id: 'P4',
    shortLabel: 'Caregiver confidence',
    question: 'Are you sure, or not sure?',
    purpose:
      'A direct metacognitive check. Low caregiver confidence should shift a "yes" answer toward "unsure" in downstream scoring.',
  },
  P5: {
    id: 'P5',
    shortLabel: 'Context / temporary factors',
    question:
      'Was your child unwell, sleepy, upset, or distracted when you checked?',
    purpose:
      'Identifies transient factors that may have suppressed a skill that is otherwise present, warranting a repeat check rather than an escalation.',
  },
};

/**
 * Resolve a list of probe IDs (e.g. ["P1", "P3"]) into their full question text.
 * Unknown IDs are silently dropped.
 */
export function resolveProbes(probeIds: string[]): string[] {
  return probeIds
    .map((id) => PROBE_DEFINITIONS[id]?.question)
    .filter((q): q is string => q !== undefined);
}

/**
 * Resolve probe IDs into their full definitions.
 * Unknown IDs are silently dropped.
 */
export function resolveProbeDefinitions(probeIds: string[]): ProbeDefinition[] {
  return probeIds
    .map((id) => PROBE_DEFINITIONS[id])
    .filter((p): p is ProbeDefinition => p !== undefined);
}
