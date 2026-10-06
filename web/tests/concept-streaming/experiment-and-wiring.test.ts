import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assignConceptStreamingArm,
  isEligibleForConceptStreaming,
  readTreatmentPercent,
  trafficBucket,
} from "@/lib/chat/concept-streaming-experiment";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const route = read("../../src/app/api/chat/route.ts");
const pipelineStart = route.indexOf("export async function runTutoringPipeline(");
const pipelineEnd = route.indexOf("\n}\n", pipelineStart);
const pipeline = route.slice(pipelineStart, pipelineEnd);
const streamStart = route.indexOf("const stream = new ReadableStream");
const streamBody = route.slice(streamStart);

test("the treatment share defaults to 0 and is clamped to 0-100", () => {
  assert.equal(readTreatmentPercent({}), 0);
  assert.equal(readTreatmentPercent({ CONCEPT_STREAMING_TREATMENT_PERCENT: "not a number" }), 0);
  assert.equal(readTreatmentPercent({ CONCEPT_STREAMING_TREATMENT_PERCENT: "-5" }), 0);
  assert.equal(readTreatmentPercent({ CONCEPT_STREAMING_TREATMENT_PERCENT: "250" }), 100);
  assert.equal(readTreatmentPercent({ CONCEPT_STREAMING_TREATMENT_PERCENT: "50" }), 50);
});

test("at 0% every eligible turn is control, so the existing non-streamed path is unchanged", () => {
  for (let index = 0; index < 500; index += 1) {
    assert.equal(
      assignConceptStreamingArm({ traceId: `trace-${index}`, eligible: true, treatmentPercent: 0 }),
      "control",
    );
  }
});

test("at 100% every eligible turn is treatment", () => {
  for (let index = 0; index < 100; index += 1) {
    assert.equal(
      assignConceptStreamingArm({ traceId: `trace-${index}`, eligible: true, treatmentPercent: 100 }),
      "treatment",
    );
  }
});

test("assignment is deterministic per trace and roughly proportional", () => {
  assert.equal(trafficBucket("abc"), trafficBucket("abc"));
  let treatment = 0;
  for (let index = 0; index < 2000; index += 1) {
    if (assignConceptStreamingArm({ traceId: `uuid-${index}-x`, eligible: true, treatmentPercent: 50 }) === "treatment") {
      treatment += 1;
    }
  }
  assert.ok(treatment > 850 && treatment < 1150, `treatment share ${treatment}/2000`);
});

test("voice, retries, and automatic AI Tutor requests are never eligible", () => {
  assert.equal(isEligibleForConceptStreaming({ modality: "voice", isRetry: false, source: null }), false);
  assert.equal(isEligibleForConceptStreaming({ modality: "text", isRetry: true, source: null }), false);
  assert.equal(isEligibleForConceptStreaming({ modality: "text", isRetry: false, source: "tutor_auto" }), false);
  assert.equal(isEligibleForConceptStreaming({ modality: "text", isRetry: false, source: "tutor" }), false);
  assert.equal(isEligibleForConceptStreaming({ modality: "text", isRetry: false, source: null }), true);
  assert.equal(assignConceptStreamingArm({ traceId: "t", eligible: false, treatmentPercent: 100 }), "ineligible");
});

test("the streaming copies of the schema, model, and token limit match lib/llm/client.ts exactly", () => {
  const client = read("../../src/lib/llm/client.ts");
  const stream = read("../../src/lib/llm/concept-explanation-stream.ts");
  assert.ok(client.includes('const MODEL = "claude-opus-4-8";'));
  assert.ok(stream.includes('const MODEL = "claude-opus-4-8";'));
  assert.ok(client.includes("const MAX_TOKENS = 1024;"));
  assert.ok(stream.includes("const MAX_TOKENS = 1024;"));
  const schemaBlock = (source: string) => {
    const start = source.indexOf("const TeachingResponseSchema = z.object({");
    return source.slice(start, source.indexOf("});", start) + 3);
  };
  assert.equal(schemaBlock(stream), schemaBlock(client));
});

test("the pipeline keeps the non-streamed Concept call for control and ineligible turns", () => {
  assert.ok(pipeline.includes('if (conceptStreamingArm === "treatment" && onConceptText) {'));
  assert.ok(pipeline.includes("explainConcept(conceptAgentContext, generateConceptExplanation)"));
});

test("Evaluation is scheduled only after events.done, which follows the persisted reply", () => {
  const scheduleIndex = streamBody.indexOf("scheduleDeferredEvaluation(supabase, pipelineResult.deferredEvaluation)");
  const doneIndex = streamBody.indexOf("events.done({");
  const persistIndex = streamBody.indexOf('.rpc("insert_assistant_message"');
  const replySentIndex = streamBody.indexOf('eventName: pipelineResult.safe ? "reply_sent" : "safety_reply_sent"');
  assert.ok(persistIndex > 0 && replySentIndex > persistIndex, "reply is persisted before reply_sent");
  assert.ok(doneIndex > replySentIndex, "done follows reply_sent");
  assert.ok(scheduleIndex > doneIndex, "Evaluation is scheduled after done");
  assert.equal(streamBody.indexOf("scheduleDeferredEvaluation(supabase, evaluation)"), -1, "no early scheduling remains");
});

test("a failed persistence returns before any Evaluation is scheduled", () => {
  const failureIndex = streamBody.indexOf("if (assistantMessageError || !assistantMessage) {");
  const returnIndex = streamBody.indexOf("return;", failureIndex);
  const scheduleIndex = streamBody.indexOf("scheduleDeferredEvaluation(supabase, pipelineResult.deferredEvaluation)");
  assert.ok(failureIndex > 0 && returnIndex > failureIndex);
  assert.ok(scheduleIndex > returnIndex, "the persistence-failure return precedes scheduling");
});

test("a Concept failure after shown text ends with a retryable error and no persistence", () => {
  const block = streamBody.slice(streamBody.indexOf("if (pipelineResult.conceptStreamFailure) {"));
  const errorLine = block.indexOf('events.error("I couldn\'t finish that explanation. Please try again.");');
  const returnLine = block.indexOf("return;");
  const persistLine = block.indexOf("insert_assistant_message");
  assert.ok(errorLine > 0 && returnLine > errorLine);
  assert.ok(persistLine === -1 || persistLine > returnLine, "no persistence after the failure");
});

test("reply_sent records the experiment arm and the first-content source", () => {
  assert.ok(streamBody.includes("conceptStreamingArm,"));
  assert.ok(streamBody.includes("firstContent.source()"));
});

test("voice and retry turns use the non-streamed path, and General streaming is unchanged", () => {
  assert.ok(route.includes("eligible: isEligibleForConceptStreaming({ modality, isRetry, source })"));
  assert.ok(route.includes("generateTeachingReplyStreaming(history, teachingGuidance, (delta) => events.chunk(delta), signal)"));
  assert.ok(route.includes("firstContent.recordTextDelta(text);"));
});
