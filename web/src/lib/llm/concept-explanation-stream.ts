import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  buildConceptAgentSystemPrompt,
  formatTeachingResponseAsReply,
  type ConceptAgentContext,
  type TeachingResponse,
} from "@/lib/agents/concept-agent";
import { createConceptExplanationExtractor } from "@/lib/agents/concept-explanation-extractor";

// Copies of the constants and schema in lib/llm/client.ts, which is hash-pinned
// and cannot change here. concept-explanation-stream.test.ts fails if these drift.
const MODEL = "claude-opus-4-8";
const MAX_TOKENS = 1024;

const TeachingResponseSchema = z.object({
  concept: z.string(),
  explanation: z.string(),
  example: z.string(),
  nextStep: z.enum(["Practice", "Clarification", "Summary"]),
  confidence: z.number().min(0).max(1),
});

export type ConceptStreamFailureReason =
  | "stream_failed"
  | "validation_failed"
  | "malformed"
  | "duplicate_key"
  | "reconcile_mismatch";

export type ConceptStreamOutcome =
  | {
      kind: "completed";
      response: TeachingResponse;
      model: string;
      inputTokens: number;
      outputTokens: number;
      displayText: string;
      displayHalted: boolean;
      displayedChars: number;
      timings: {
        modelFirstDeltaMs: number | null;
        firstExplanationCharMs: number | null;
        finalValidationMs: number;
      };
    }
  | { kind: "failed"; reason: ConceptStreamFailureReason; shownPartial: boolean; displayedChars: number }
  | { kind: "cancelled"; shownPartial: boolean; displayedChars: number };

export type ConceptStreamDeps = {
  client?: Pick<Anthropic, "messages">;
};

const defaultClient = () => new Anthropic();

/**
 * Streams the Concept structured response. Decoded learner text goes to
 * onDisplayText as it arrives. The final object is validated by the SDK's
 * Zod parse and by TeachingResponseSchema, then reconciled with what was
 * displayed. Nothing here persists or evaluates anything.
 */
export async function streamConceptExplanation(
  context: ConceptAgentContext,
  options: { onDisplayText: (text: string) => void; signal?: AbortSignal },
  deps: ConceptStreamDeps = {},
): Promise<ConceptStreamOutcome> {
  const startedAt = performance.now();
  const elapsed = () => Math.round(performance.now() - startedAt);
  const extractor = createConceptExplanationExtractor();
  const client = deps.client ?? defaultClient();

  let displayedChars = 0;
  let firstDeltaMs: number | null = null;
  let firstCharMs: number | null = null;

  try {
    const stream = client.messages.stream(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: buildConceptAgentSystemPrompt(context),
        messages: context.history,
        output_config: { format: zodOutputFormat(TeachingResponseSchema) },
      },
      { signal: options.signal },
    );

    for await (const event of stream) {
      if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue;
      if (firstDeltaMs === null) firstDeltaMs = elapsed();
      const emitted = extractor.push(event.delta.text);
      if (emitted.length === 0) continue;
      if (firstCharMs === null) firstCharMs = elapsed();
      displayedChars += emitted.length;
      options.onDisplayText(emitted);
    }

    const message = await stream.finalMessage();
    const streamEndedAt = elapsed();
    const parsed = message.parsed_output;
    const validated = TeachingResponseSchema.safeParse(parsed);
    const finalValidationMs = elapsed() - streamEndedAt;

    const extraction = extractor.finish();
    const shownPartial = displayedChars > 0;

    if (!validated.success) {
      return { kind: "failed", reason: "validation_failed", shownPartial, displayedChars };
    }
    if (extraction.status === "malformed") {
      return { kind: "failed", reason: "malformed", shownPartial, displayedChars };
    }
    if (extraction.status === "duplicate_key") {
      return { kind: "failed", reason: "duplicate_key", shownPartial, displayedChars };
    }
    if (!extraction.displayHalted && extraction.displayText !== formatTeachingResponseAsReply(validated.data)) {
      return { kind: "failed", reason: "reconcile_mismatch", shownPartial, displayedChars };
    }

    return {
      kind: "completed",
      response: validated.data,
      model: message.model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      displayText: extraction.displayText,
      displayHalted: extraction.displayHalted,
      displayedChars,
      timings: { modelFirstDeltaMs: firstDeltaMs, firstExplanationCharMs: firstCharMs, finalValidationMs },
    };
  } catch (err) {
    const shownPartial = displayedChars > 0;
    if (options.signal?.aborted || err instanceof Anthropic.APIUserAbortError) {
      return { kind: "cancelled", shownPartial, displayedChars };
    }
    const isStructuredFailure =
      err instanceof Anthropic.AnthropicError && err.message.startsWith("Failed to parse structured output");
    return {
      kind: "failed",
      reason: isStructuredFailure ? "validation_failed" : "stream_failed",
      shownPartial,
      displayedChars,
    };
  }
}
