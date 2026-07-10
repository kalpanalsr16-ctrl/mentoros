import type { LearnerStateProvider } from "@/lib/learner/learner-state-provider";

/**
 * First LearnerStateProvider implementation: always reports an unknown
 * learner. This is correct, not a placeholder to feel bad about -- until
 * Assessment/Memory Agents (M7/M8) exist to write real mastery data,
 * every real student genuinely is unknown, and Planning Agent's own spec
 * already defines the right behavior for that case (Diagnostic Strategy).
 */
export const unknownLearnerStateProvider: LearnerStateProvider = {
  async getLearnerState() {
    return { isKnown: false };
  },
};
