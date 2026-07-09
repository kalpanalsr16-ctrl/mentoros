export type SafetyCategory =
  | "self_harm"
  | "violence"
  | "sexual_content"
  | "prompt_injection";

export type SafetyCheckResult =
  | { safe: true }
  | { safe: false; category: SafetyCategory };

type UnsafePattern = {
  category: SafetyCategory;
  pattern: RegExp;
};

/**
 * Baseline, keyword-based safety filter for Milestone M0.
 *
 * This is intentionally simple: deterministic pattern matching, no AI
 * model involved. MentorOS has no LLM integration until Milestone M1
 * (per 06_Technical_Architecture.md, the LLM provider is only "set up"
 * in M0 -- account and key -- and isn't actually called until M1), so
 * the M0 filter can't be an AI classifier even if that would eventually
 * be more accurate.
 *
 * The full Safety Agent spec (05_Agent_Architecture/03_Safety_Agent.md --
 * prompt injection defense, academic integrity, age-appropriateness,
 * risk-level escalation) is implemented properly in Milestone M9, once
 * real usage patterns exist to design against instead of guessing.
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
    case "violence":
    case "sexual_content":
    default:
      return "I can't help with that here. Let's get back to your math questions — what would you like to work on?";
  }
}
