import type {
  ActionProfileType,
  Action,
  Severity,
  QuestionResult,
} from './types.js';

// ---------------------------------------------------------------------------
// Profile descriptors
// ---------------------------------------------------------------------------

interface ProfileConfig {
  name: string;
  description: string;
  /**
   * Map from severity level to what action type & urgency to generate.
   * Missing severity levels produce no action.
   */
  rules: Partial<
    Record<
      Severity,
      {
        type: Action['type'];
        urgency: Action['urgency'];
        description: string;
      }
    >
  >;
}

const PROFILES: Record<ActionProfileType, ProfileConfig> = {
  'AP-STD': {
    name: 'Standard Monitoring',
    description: 'General developmental monitoring pathway.',
    rules: {
      precaution: {
        type: 'recheck',
        urgency: 'routine',
        description:
          'Re-check this milestone at the next scheduled check-in. No action needed right now.',
      },
      warning: {
        type: 'coaching',
        urgency: 'routine',
        description:
          'Try some of the suggested activities at home and re-check within 4 weeks.',
      },
      flag: {
        type: 'clinician_discussion',
        urgency: 'soon',
        description:
          'Discuss this milestone with your child\'s doctor at the next visit (within 4 weeks).',
      },
      watch: {
        type: 'recheck',
        urgency: 'routine',
        description:
          'The caregiver was unsure — try the suggested probes and re-check within 2 weeks.',
      },
    },
  },

  'AP-LANG': {
    name: 'Language Pathway',
    description:
      'Specialised monitoring for receptive and expressive language milestones.',
    rules: {
      precaution: {
        type: 'coaching',
        urgency: 'routine',
        description:
          'Try talking, reading, and singing with your child every day. Re-check in 3–4 weeks.',
      },
      warning: {
        type: 'coaching',
        urgency: 'routine',
        description:
          'Language development may need support. Consider completing a validated 18-month or 30-month language screen. Discuss with your doctor.',
      },
      flag: {
        type: 'screening_referral',
        urgency: 'soon',
        description:
          'This language milestone is significantly overdue. A validated language screening (e.g. M-CHAT-R/F, CSBS-DP) and discussion with a speech-language pathologist is recommended.',
      },
      watch: {
        type: 'recheck',
        urgency: 'routine',
        description:
          'The caregiver was unsure about this language skill. Use the suggested probes and re-check within 2 weeks.',
      },
    },
  },

  'AP-MOTOR': {
    name: 'Motor Pathway',
    description: 'Monitoring pathway for gross and fine motor milestones.',
    rules: {
      precaution: {
        type: 'recheck',
        urgency: 'routine',
        description:
          'Give your child plenty of floor time and opportunities to practice. Re-check in 3–4 weeks.',
      },
      warning: {
        type: 'clinician_discussion',
        urgency: 'routine',
        description:
          'This motor milestone may be delayed. Please mention it at your child\'s next well-visit.',
      },
      flag: {
        type: 'specialist_referral',
        urgency: 'soon',
        description:
          'This motor milestone is significantly overdue. A physiotherapy or occupational therapy evaluation is recommended.',
      },
      watch: {
        type: 'recheck',
        urgency: 'routine',
        description:
          'The caregiver was unsure about this motor skill. Try the probes and re-check within 2 weeks.',
      },
    },
  },

  'AP-SENS': {
    name: 'Sensory Pathway',
    description:
      'Pathway for vision and hearing concerns. Earlier escalation thresholds apply.',
    rules: {
      precaution: {
        type: 'recheck',
        urgency: 'routine',
        description:
          'Re-check this sensory milestone at the next opportunity in a quiet, well-lit environment.',
      },
      warning: {
        type: 'clinician_discussion',
        urgency: 'soon',
        description:
          'There may be a vision or hearing concern. Please raise this with your child\'s doctor promptly.',
      },
      flag: {
        type: 'screening_referral',
        urgency: 'urgent',
        description:
          'A significant sensory concern has been identified. Hearing or vision screening should be arranged urgently.',
      },
      watch: {
        type: 'recheck',
        urgency: 'routine',
        description:
          'The caregiver was unsure. Test in a quiet environment without distractions and re-check within 2 weeks.',
      },
    },
  },

  'AP-RF': {
    name: 'Red Flag Pathway',
    description:
      'Immediate escalation pathway for developmental regression or universal red flags.',
    rules: {
      precaution: {
        type: 'clinician_discussion',
        urgency: 'soon',
        description:
          'This response suggests a possible concern. Please discuss with your child\'s doctor.',
      },
      warning: {
        type: 'clinician_discussion',
        urgency: 'soon',
        description:
          'This response suggests a developmental concern that needs clinician review.',
      },
      flag: {
        type: 'clinician_discussion',
        urgency: 'urgent',
        description:
          'This is a red flag response. Please contact your child\'s doctor today.',
      },
      watch: {
        type: 'clinician_discussion',
        urgency: 'soon',
        description:
          'The caregiver was unsure about a red-flag item. Please clarify and contact your doctor if the concern persists.',
      },
    },
  },

  'AP-ADAPT': {
    name: 'Adaptive / Self-Help',
    description:
      'Gentle monitoring pathway for self-help and adaptive skills with later escalation thresholds.',
    rules: {
      precaution: {
        type: 'recheck',
        urgency: 'routine',
        description:
          'Self-help skills often emerge gradually. Keep offering opportunities and re-check in 4 weeks.',
      },
      warning: {
        type: 'coaching',
        urgency: 'routine',
        description:
          'Try breaking this skill into smaller steps and practicing daily. Re-check in 4–6 weeks.',
      },
      flag: {
        type: 'clinician_discussion',
        urgency: 'routine',
        description:
          'This adaptive skill is significantly overdue. Please mention it at the next doctor\'s visit.',
      },
      watch: {
        type: 'recheck',
        urgency: 'routine',
        description:
          'The caregiver was unsure. Offer a structured opportunity and re-check in 2 weeks.',
      },
    },
  },

  'AP-TOILET': {
    name: 'Toilet Readiness',
    description:
      'Reassurance-first pathway for toilet training readiness. No pressure or urgent escalation.',
    rules: {
      precaution: {
        type: 'coaching',
        urgency: 'routine',
        description:
          'Toilet readiness varies widely. Continue to watch for readiness signs — there is no rush.',
      },
      warning: {
        type: 'coaching',
        urgency: 'routine',
        description:
          'Toilet training readiness is highly variable. Keep encouraging without pressure. Re-check in 8 weeks.',
      },
      flag: {
        type: 'clinician_discussion',
        urgency: 'routine',
        description:
          'Toilet training has not started by an unusually late age. Mention this at your next doctor\'s visit to rule out physical or developmental factors.',
      },
      watch: {
        type: 'recheck',
        urgency: 'routine',
        description:
          'The caregiver was unsure. Re-check when the child is calm and has had recent opportunities to practice.',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate Action objects for a list of QuestionResults.
 *
 * Groups questions by their action profile and severity, then produces
 * one Action per distinct (profile × severity) combination.
 */
export function buildActions(questionResults: QuestionResult[]): Action[] {
  // Only generate actions for results that warrant attention
  const actionable = questionResults.filter((qr) =>
    ['precaution', 'warning', 'flag', 'watch'].includes(qr.severity),
  );

  if (actionable.length === 0) return [];

  // Group by actionProfile + severity
  const groups = new Map<string, QuestionResult[]>();
  for (const qr of actionable) {
    const key = `${qr.actionProfile}::${qr.severity}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(qr);
    } else {
      groups.set(key, [qr]);
    }
  }

  const actions: Action[] = [];

  for (const [key, qrs] of groups) {
    const [profileKey, severity] = key.split('::') as [ActionProfileType, string];
    const profile = PROFILES[profileKey];

    if (!profile) continue;

    const rule = profile.rules[severity as keyof typeof profile.rules];
    if (!rule) continue;

    actions.push({
      type: rule.type,
      description: rule.description,
      urgency: rule.urgency,
      questionIds: qrs.map((qr) => qr.questionId),
    });
  }

  // Sort by urgency: urgent > soon > routine
  const urgencyOrder: Record<Action['urgency'], number> = {
    urgent: 2,
    soon: 1,
    routine: 0,
  };

  actions.sort((a, b) => urgencyOrder[b.urgency] - urgencyOrder[a.urgency]);

  return actions;
}

/**
 * Get the profile configuration for a given action profile type.
 */
export function getProfileConfig(profile: ActionProfileType): ProfileConfig {
  return PROFILES[profile];
}
