import { test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { streamConceptExplanation } from "@/lib/llm/concept-explanation-stream";
import { formatTeachingResponseAsReply, type ConceptAgentContext, type TeachingResponse } from "@/lib/agents/concept-agent";

const CONTEXT = {
  concept: { id: "subtraction-with-regrouping", name: "Subtraction with regrouping" },
  learningObjectives: [],
  misconceptions: [],
  teachingStrategies: [],
  plan: { strategy: "Revision", difficulty: "Intermediate", pace: "Medium", followUpRequired: true },
  personalizationProfile: {
    teachingStyle: "ExampleFirst",
    difficulty: "Intermediate",
    pace: "Medium",
    exampleStyle: "RealLife",
    encouragement: "Medium",
    hintLevel: "Progressive",
  },
  history: [{ role: "user", content: "Explain subtraction with regrouping." }],
} as unknown as ConceptAgentContext;

const RESPONSE: TeachingResponse = {
  concept: "Subtraction with regrouping",
  explanation: 'Borrow 1 ten: it becomes 10 ones, so "42 - 17" works.',
  example: "42 - 17 = 25",
  nextStep: "Practice",
  confidence: 0.84,
};

const RAW = JSON.stringify(RESPONSE);

function fakeStream(chunks: string[], options: { finalError?: Error; streamError?: Error; final?: unknown } = {}) {
  const parsed = options.final ?? RESPONSE;
  return {
    async *[Symbol.asyncIterator]() {
      yield { type: "message_start" };
      for (const chunk of chunks) {
        yield { type: "content_block_delta", delta: { type: "text_delta", text: chunk } };
      }
      if (options.streamError) throw options.streamError;
      yield { type: "message_stop" };
    },
    async finalMessage() {
      if (options.finalError) throw options.finalError;
      return {
        model: "claude-opus-4-8",
        usage: { input_tokens: 467, output_tokens: 212 },
        parsed_output: parsed,
      };
    },
  };
}

function run(stream: unknown, signal?: AbortSignal) {
  const displayed: string[] = [];
  const client = { messages: { stream: () => stream } } as never;
  const promise = streamConceptExplanation(
    CONTEXT,
    { onDisplayText: (text) => displayed.push(text), signal },
    { client },
  );
  return { promise, displayed: () => displayed.join("") };
}

function byChar(text: string) {
  return text.split("");
}

test("a completed stream returns the canonical response and displays exactly the formatted reply", async () => {
  const { promise, displayed } = run(fakeStream(byChar(RAW)));
  const outcome = await promise;
  assert.equal(outcome.kind, "completed");
  if (outcome.kind !== "completed") return;
  assert.deepEqual(outcome.response, RESPONSE);
  assert.equal(displayed(), formatTeachingResponseAsReply(RESPONSE));
  assert.equal(outcome.displayText, formatTeachingResponseAsReply(RESPONSE));
  assert.equal(outcome.displayHalted, false);
  assert.equal(outcome.displayedChars, formatTeachingResponseAsReply(RESPONSE).length);
});

test("first delta, first explanation character, and final validation are timed separately", async () => {
  const { promise } = run(fakeStream(byChar(RAW)));
  const outcome = await promise;
  assert.equal(outcome.kind, "completed");
  if (outcome.kind !== "completed") return;
  const { modelFirstDeltaMs, firstExplanationCharMs, finalValidationMs } = outcome.timings;
  assert.ok(typeof modelFirstDeltaMs === "number");
  assert.ok(typeof firstExplanationCharMs === "number");
  assert.ok((firstExplanationCharMs as number) >= (modelFirstDeltaMs as number));
  assert.ok(finalValidationMs >= 0);
});

test("a network failure after partial text reports shownPartial and never returns a response", async () => {
  const { promise, displayed } = run(fakeStream(byChar(RAW).slice(0, 80), { streamError: new Error("socket reset") }));
  const outcome = await promise;
  assert.equal(outcome.kind, "failed");
  if (outcome.kind !== "failed") return;
  assert.equal(outcome.reason, "stream_failed");
  assert.equal(outcome.shownPartial, true);
  assert.ok(displayed().length > 0);
  assert.equal("response" in outcome, false);
});

test("a network failure before any text reports shownPartial false, so the existing fallback may run", async () => {
  const { promise } = run(fakeStream([], { streamError: new Error("connection refused") }));
  const outcome = await promise;
  assert.equal(outcome.kind, "failed");
  if (outcome.kind !== "failed") return;
  assert.equal(outcome.shownPartial, false);
});

test("final Zod validation failure after partial display is a failure with shownPartial true", async () => {
  const invalid = { ...RESPONSE, nextStep: "Dance" };
  const { promise } = run(fakeStream(byChar(RAW), { final: invalid }));
  const outcome = await promise;
  assert.equal(outcome.kind, "failed");
  if (outcome.kind !== "failed") return;
  assert.equal(outcome.reason, "validation_failed");
  assert.equal(outcome.shownPartial, true);
});

test("an SDK structured-output parse failure is classified as validation_failed", async () => {
  const error = new Anthropic.AnthropicError("Failed to parse structured output: bad schema");
  const { promise } = run(fakeStream(byChar(RAW), { finalError: error }));
  const outcome = await promise;
  assert.equal(outcome.kind, "failed");
  if (outcome.kind !== "failed") return;
  assert.equal(outcome.reason, "validation_failed");
});

test("a streamed explanation that disagrees with the canonical reply is a reconcile failure", async () => {
  const changed = { ...RESPONSE, explanation: "A different explanation entirely." };
  const { promise } = run(fakeStream(byChar(RAW), { final: changed }));
  const outcome = await promise;
  assert.equal(outcome.kind, "failed");
  if (outcome.kind !== "failed") return;
  assert.equal(outcome.reason, "reconcile_mismatch");
  assert.equal(outcome.shownPartial, true);
});

test("an abort is classified as cancelled, not as a model failure", async () => {
  const controller = new AbortController();
  const abortError = new Anthropic.APIUserAbortError({ message: "Request was aborted." });
  const stream = {
    async *[Symbol.asyncIterator]() {
      yield { type: "content_block_delta", delta: { type: "text_delta", text: '{"concept":"c","explanation":"Part' } };
      controller.abort();
      throw abortError;
    },
    async finalMessage() {
      throw abortError;
    },
  };
  const { promise } = run(stream, controller.signal);
  const outcome = await promise;
  assert.equal(outcome.kind, "cancelled");
  if (outcome.kind !== "cancelled") return;
  assert.equal(outcome.shownPartial, true);
});

test("malformed final text is a failure, not a completed response", async () => {
  const stream = {
    async *[Symbol.asyncIterator]() {
      yield { type: "content_block_delta", delta: { type: "text_delta", text: '{"concept":"c" "explanation":' } };
    },
    async finalMessage() {
      return { model: "claude-opus-4-8", usage: { input_tokens: 1, output_tokens: 1 }, parsed_output: RESPONSE };
    },
  };
  const outcome = await run(stream).promise;
  assert.equal(outcome.kind, "failed");
  if (outcome.kind !== "failed") return;
  assert.equal(outcome.reason, "malformed");
});

test("no JSON syntax reaches the display, even when the stream is split at every character", async () => {
  const { promise, displayed } = run(fakeStream(byChar(RAW)));
  await promise;
  assert.equal(displayed().includes('"explanation"'), false);
  assert.equal(displayed().includes("{"), false);
  assert.equal(displayed().includes("confidence"), false);
});
