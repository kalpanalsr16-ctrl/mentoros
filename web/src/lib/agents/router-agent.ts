import type { ClaudeMessage } from "@/lib/agents/context-agent";
import type { RouterClassificationResult } from "@/lib/llm/client";
import type { IntentObject } from "@/lib/agents/intent-object";

/**
 * Below this confidence, the Router Agent asks for clarification instead
 * of acting on a guessed intent (05_Agent_Architecture/04_Router_Agent.md,
 * Recovery Strategy). Exposed as a named constant, not inlined, so it can
 * be tuned later without touching routing logic.
 */
export const ROUTING_CONFIDENCE_THRESHOLD = 0.8;

const DEFAULT_CLARIFICATION_QUESTION =
  "Could you say a bit more about what you'd like help with?";

export type RouterResult =
  | { success: true; intent: IntentObject; model: string }
  | { success: false; reason: string };

/**
 * Intent analysis and routing only -- never generates a teaching reply.
 * Callers decide what to do with the result; when `needsClarification` is
 * false, the caller is expected to fall through to whatever the current
 * teaching implementation is (M1's generateTeachingReply today, the real
 * Concept Agent from M6 onward) without this module needing to change.
 *
 * `classify` is a required, injected function (the caller passes
 * classifyIntentWithClaude from lib/llm/client in production) rather than
 * an internal import, so this module has no runtime dependency on the
 * Anthropic SDK -- the confidence-threshold logic can be unit-tested with
 * a mock, and this file stays purely about routing decisions, not how
 * classification happens. Same seam checkRateLimit() uses for its
 * Supabase client.
 */
export async function classifyIntent(
  history: ClaudeMessage[],
  classify: (history: ClaudeMessage[]) => Promise<RouterClassificationResult>,
): Promise<RouterResult> {
  const result = await classify(history);

  if (!result.success) {
    return result;
  }

  const { classification, model } = result;
  const needsClarification =
    classification.confidence < ROUTING_CONFIDENCE_THRESHOLD;

  const intent: IntentObject = {
    primaryIntent: classification.primaryIntent,
    secondaryIntent: classification.secondaryIntent ?? undefined,
    confidence: classification.confidence,
    topic: classification.topic ?? undefined,
    subtopic: classification.subtopic ?? undefined,
    needsClarification,
    clarificationQuestion: needsClarification
      ? classification.clarificationQuestion ?? DEFAULT_CLARIFICATION_QUESTION
      : undefined,
  };

  return { success: true, intent, model };
}
