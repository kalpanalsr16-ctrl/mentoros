import type { PersonalizationContext } from "@/lib/agents/personalization-context";
import type { PreferredLearningStyle } from "@/lib/learner/learner-state";

/**
 * Grade at or below this is treated as a "Young Learner" per
 * 06_Personalization_Agent.md's Personalization Strategies section.
 * Named, not inlined, so it can be tuned without touching decision logic.
 */
export const YOUNG_LEARNER_MAX_GRADE = 5;

export type TeachingStyle = PreferredLearningStyle;
export type ExampleStyle = "RealLife" | "Visual" | "Abstract";
export type EncouragementLevel = "Low" | "Medium" | "High";
export type HintLevel = "Minimal" | "Progressive" | "Direct";

export type PersonalizationProfile = {
  teachingStyle: TeachingStyle;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  pace: "Slow" | "Medium" | "Fast";
  exampleStyle: ExampleStyle;
  encouragement: EncouragementLevel;
  hintLevel: HintLevel;
  rationale: string;
};

/**
 * Pure decision logic -- no I/O, unit-testable with a hand-built
 * PersonalizationContext. Mirrors
 * 05_Agent_Architecture/06_Personalization_Agent.md's Personalization
 * Strategies (Low Confidence Learner, High Mastery Learner, Young/
 * Intermediate/Advanced Learner) and Recovery Strategy (fall back to a
 * standard profile when learner information is insufficient).
 *
 * Personalization does not decide *whether* to teach, practice, or
 * assess -- that's Planning's job (see plan.strategy) -- only *how*:
 * style, pace, difficulty, examples, encouragement, and hint level.
 * Every real learner reports `isKnown: false` until M8, so the fallback
 * branch is expected to dominate in production for now -- the same
 * honest situation Planning Agent (M3) is in.
 */
export function decidePersonalization(
  context: PersonalizationContext,
): PersonalizationProfile {
  const { learnerState } = context.planningContext;
  const { plan } = context;

  if (!learnerState.isKnown) {
    return {
      teachingStyle: "StepByStep",
      difficulty: plan.difficulty,
      pace: plan.pace,
      exampleStyle: "RealLife",
      encouragement: "High",
      hintLevel: "Progressive",
      rationale:
        "Learner preferences are unknown -- applying a standard, encouraging default profile.",
    };
  }

  if (learnerState.confidence === "Low") {
    return {
      teachingStyle: learnerState.preferredLearningStyle ?? "StepByStep",
      difficulty: "Beginner",
      pace: "Slow",
      exampleStyle: "RealLife",
      encouragement: "High",
      hintLevel: "Progressive",
      rationale:
        "Learner confidence is low -- smaller steps, easier questions, and frequent encouragement.",
    };
  }

  if (plan.strategy === "PracticeFirst") {
    return {
      teachingStyle: learnerState.preferredLearningStyle ?? "Conversational",
      difficulty: "Advanced",
      pace: "Fast",
      exampleStyle: "Abstract",
      encouragement: "Medium",
      hintLevel: "Minimal",
      rationale:
        "High mastery signaled by Planning's PracticeFirst strategy -- minimal guidance, more challenge.",
    };
  }

  if (learnerState.grade !== undefined && learnerState.grade <= YOUNG_LEARNER_MAX_GRADE) {
    return {
      teachingStyle: learnerState.preferredLearningStyle ?? "Visual",
      difficulty: plan.difficulty,
      pace: plan.pace,
      exampleStyle: "RealLife",
      encouragement: "High",
      hintLevel: "Progressive",
      rationale: `Young learner (grade ${learnerState.grade}) -- visual, story-like teaching style with frequent encouragement.`,
    };
  }

  return {
    teachingStyle: learnerState.preferredLearningStyle ?? "ExampleFirst",
    difficulty: plan.difficulty,
    pace: plan.pace,
    exampleStyle: "RealLife",
    encouragement: "Medium",
    hintLevel: "Progressive",
    rationale:
      "Standard intermediate profile -- worked examples followed by guided practice.",
  };
}

const TEACHING_STYLE_TEXT: Record<TeachingStyle, string> = {
  Visual: "Use visual descriptions and concrete imagery to explain ideas.",
  Conversational: "Keep the tone conversational and reasonably concise.",
  StepByStep: "Break the explanation into clear, numbered steps.",
  ExampleFirst: "Lead with a worked example before explaining the underlying idea.",
  PracticeFirst: "Favor a practice-oriented response over an upfront explanation.",
};

const EXAMPLE_STYLE_TEXT: Record<ExampleStyle, string> = {
  RealLife: "Use real-life, everyday examples.",
  Visual: "Use visual, concrete examples.",
  Abstract: "Abstract or symbolic examples are fine here.",
};

const HINT_LEVEL_TEXT: Record<HintLevel, string> = {
  Minimal: "Give minimal hints -- let the student work most of it out themselves.",
  Progressive: "If a hint is needed, give one small step at a time rather than the full answer.",
  Direct: "Be fairly direct with hints -- this student benefits from clearer guidance.",
};

const ENCOURAGEMENT_TEXT: Record<EncouragementLevel, string> = {
  Low: "Keep encouragement understated.",
  Medium: "Include natural encouragement.",
  High: "Be warm and encouraging, and celebrate small wins.",
};

/**
 * Translates a PersonalizationProfile into a short natural-language
 * instruction appended to M1's teaching-reply system prompt -- this,
 * not Planning's raw guidance, is what actually reaches
 * generateTeachingReply(), since Personalization is the spec's
 * documented "single source of truth" for how teaching should feel.
 */
export function describePersonalizationForPrompt(
  profile: PersonalizationProfile,
): string {
  return [
    TEACHING_STYLE_TEXT[profile.teachingStyle],
    `Keep the pace ${profile.pace.toLowerCase()} and the language ${profile.difficulty.toLowerCase()}-level.`,
    EXAMPLE_STYLE_TEXT[profile.exampleStyle],
    HINT_LEVEL_TEXT[profile.hintLevel],
    ENCOURAGEMENT_TEXT[profile.encouragement],
  ].join(" ");
}
