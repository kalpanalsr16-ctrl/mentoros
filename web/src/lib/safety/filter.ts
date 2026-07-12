export type SafetyCategory =
  | "self_harm"
  | "violence"
  | "sexual_content"
  | "prompt_injection"
  | "academic_integrity"
  | "privacy_concern"
  | "platform_abuse";

export type SafetyCheckResult =
  | { safe: true }
  | { safe: false; category: SafetyCategory };

type UnsafePattern = {
  category: SafetyCategory;
  pattern: RegExp;
};

/**
 * Baseline, keyword-based safety filter, originally built in M0 as a
 * placeholder and now Layer 1 of M9's two-layer Safety Agent (see
 * lib/agents/safety-agent.ts) -- deterministic, zero-cost, zero-latency,
 * and per 11_Policy_Engine.md's explicit requirement, the confirmed
 * floor full Safety Agent "must not regress below." Only covers the four
 * categories below; academic_integrity/privacy_concern/platform_abuse
 * (added in M9) have no keyword-pattern equivalent -- those are only
 * ever produced by Layer 2's LLM-based check, which runs when this
 * filter doesn't already flag the message.
 */
const UNSAFE_PATTERNS: UnsafePattern[] = [
  {
    category: "self_harm",
    pattern:
      /\b(kill myself|want to die|end my life|hurt myself|thinking about suicide|suicidal)\b/i,
  },
  {
    category: "violence",
    pattern:
      /\b(make a bomb|build (a |an )?(bomb|explosive)|make a weapon|hurt someone|kill someone|how to kill)\b/i,
  },
  {
    category: "sexual_content",
    pattern: /\b(nudes?|porn|sexual acts?|sexual content)\b/i,
  },
  {
    // Examples drawn directly from 03_Safety_Agent.md's "Prompt Injection" section.
    category: "prompt_injection",
    pattern:
      /\b(ignore (all )?previous instructions|disregard previous instructions|reveal your system prompt|show me your system prompt|pretend you('re| are) not mentoros|you are not mentoros|disable safety|jailbreak)\b/i,
  },
];

export function checkMessageSafety(content: string): SafetyCheckResult {
  for (const { category, pattern } of UNSAFE_PATTERNS) {
    if (pattern.test(content)) {
      return { safe: false, category };
    }
  }
  return { safe: true };
}

/**
 * Friendly, category-aware decline message shown in place of the usual
 * placeholder reply. Never shames the learner (00_Product_Principles.md,
 * Principle 7 -- "Mistakes Are Valuable" / never discourage), and for
 * self-harm specifically, points toward a real person rather than just
 * refusing -- a flat "I can't help with that" is not an acceptable
 * response to a genuine cry for help.
 */
export function buildSafetyDeclineMessage(category: SafetyCategory): string {
  switch (category) {
    case "self_harm":
      return "I'm really concerned about what you shared, and I want you to be okay. I'm not able to help with this myself, but please tell a trusted adult right away — a parent, teacher, or school counselor — or reach out to a local crisis helpline. You deserve real support, not just a chat with me.";
    case "prompt_injection":
      return "I can't do that. I'm MentorOS, here to help you learn — what would you like to work on?";
    case "academic_integrity":
      return "I want to help you actually learn this, not just hand you the answer — let's work through it together with a hint or two instead. What part are you stuck on?";
    case "privacy_concern":
      return "I can't share that. Let's get back to your math questions — what would you like to work on?";
    case "violence":
    case "sexual_content":
    case "platform_abuse":
    default:
      return "I can't help with that here. Let's get back to your math questions — what would you like to work on?";
  }
}
