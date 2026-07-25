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

/**
 * Deterministic completeness check, run before the clarification gate --
 * catches the exact bug class reported live: "can you answer this addition
 * question 45+89" got `confidence: 0.72` (genuine uncertainty about which
 * *category* -- Learning vs. Assessment vs. Practice -- best labels an
 * answer-checking-shaped, topic-shaped request) and that alone tripped
 * clarification, even though nothing about the request was actually
 * incomplete. Category confidence and specification-completeness are two
 * different questions; this function answers the second one directly,
 * independent of any LLM call, for the one request shape a regex can
 * check with full confidence: an explicit arithmetic expression with both
 * operands present.
 *
 * Deliberately loose on `-` also matching non-arithmetic hyphenated
 * numbers (phone numbers, dates) -- a false positive here only skips
 * clarification for something that turns out not to need it, the safer
 * failure direction for a tutoring product, and not a plausible input for
 * this product's actual users. Negative numbers aren't specially
 * handled -- "-5+89" still matches (via the "5+89" substring), which is
 * accepted, not engineered for.
 */
const ARITHMETIC_PATTERNS: RegExp[] = [
  // Symbolic: "45+89", "52-28", "6*7", "6×7", "10/2", "45 + 89", with optional decimals/spacing.
  /\d+(\.\d+)?\s*[+\-×÷*/]\s*\d+(\.\d+)?/,
  // Word-form binary operators: "45 plus 89", "45 minus 89", "45 times 89", "45 divided by 89".
  /\d+\s*plus\s*\d+/i,
  /\d+\s*minus\s*\d+/i,
  /\d+\s*times\s*\d+/i,
  /\d+\s*divided\s*by\s*\d+/i,
  // Word-form imperative phrasing: "multiply 6 by 7", "divide 10 by 2".
  /multiply\s*\d+\s*by\s*\d+/i,
  /divide\s*\d+\s*by\s*\d+/i,
];

/**
 * True only when both an operation and both operands are actually
 * present -- "45+" (missing the second operand) correctly returns false,
 * same as two unrelated numbers with no operator between them ("I'm 10
 * years old and in grade 5"). Exported for direct per-pattern unit
 * testing, not just through classifyIntent.
 */
export function hasExplicitArithmeticExpression(content: string): boolean {
  return ARITHMETIC_PATTERNS.some((pattern) => pattern.test(content));
}

export type RouterResult =
  | {
      success: true;
      intent: IntentObject;
      model: string;
      inputTokens: number;
      outputTokens: number;
    }
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

  const { classification, model, inputTokens, outputTokens } = result;

  // The model's own `requestIsFullySpecified` is a nullable, best-effort
  // signal (see RouterClassificationSchema) -- absent/null defaults to
  // false here, meaning "not confirmed complete," which only ever falls
  // through to the existing confidence-threshold gate below. It never
  // widens clarification beyond today's behavior; only the deterministic
  // arithmetic check and an explicit `true` from the model can narrow it.
  const latestUserMessage = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const isSufficientlySpecified =
    hasExplicitArithmeticExpression(latestUserMessage) || (classification.requestIsFullySpecified ?? false);

  // Confidence threshold is UNCHANGED (still 0.8, still gates the
  // non-arithmetic/non-fully-specified case) -- specification-completeness
  // is a separate, prior check, not a lowered bar for the same one.
  const needsClarification =
    !isSufficientlySpecified && classification.confidence < ROUTING_CONFIDENCE_THRESHOLD;

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

  return { success: true, intent, model, inputTokens, outputTokens };
}
