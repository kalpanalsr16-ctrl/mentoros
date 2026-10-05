import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTraceView, findVoiceTraceId } from "@/lib/observability/transparency-provider";
import type { EventRow } from "@/lib/agents/observability-agent";

function row(eventName: string, payload: Record<string, unknown>): EventRow {
  return {
    event_name: eventName,
    payload,
    created_at: new Date().toISOString(),
    conversation_id: "conv-1",
    student_id: "student-1",
  };
}

test("no events for a trace returns null, not an empty view", () => {
  assert.equal(buildTraceView("trace-1", []), null);
});

test("a safety block produces a single blocked Safety node", () => {
  const view = buildTraceView("trace-1", [
    row("safety_blocked", { category: "platform_abuse", riskLevel: "High", confidence: 0.9 }),
  ]);

  assert.ok(view);
  assert.equal(view!.nodes.length, 1);
  assert.equal(view!.nodes[0].agent, "Safety");
  assert.equal(view!.nodes[0].status, "blocked");
  assert.equal(view!.nodes[0].headline, "Block");
  assert.deepEqual(
    view!.nodes[0].details.map((d) => d.label),
    ["Risk level", "Category", "Confidence"],
  );
});

test("a successful concept turn orders nodes in pipeline order and derives Knowledge Retrieval", () => {
  const events: EventRow[] = [
    row("message_received", { riskLevel: "Low", confidence: 0.98, contentLength: 40 }),
    row("intent_detected", { primaryIntent: "Concept", confidence: 0.9, topic: "Addition", latencyMs: 200 }),
    row("learning_plan_created", { strategy: "ConceptFirst", difficulty: "Medium", pace: "Normal", conceptResolved: true }),
    row("concept_explained", {
      model: "claude-opus-4-8",
      nextStep: "Practice",
      confidence: 0.92,
      inputTokens: 500,
      outputTokens: 300,
      estimatedCostUsd: 0.01,
      latencyMs: 600,
    }),
    row("evaluation_completed", {
      overallScore: 92,
      qualityStatus: "Good",
      groundedness: 95,
      accuracy: 90,
      educationalQuality: 88,
      personalization: 85,
      clarity: 91,
      safety: 100,
      hallucinationRisk: "Low",
      evaluationLatencyMs: 180,
      evaluationInputTokens: 100,
      evaluationOutputTokens: 50,
      evaluationCostUsd: 0.002,
    }),
  ];

  const view = buildTraceView("trace-2", events);
  assert.ok(view);
  assert.deepEqual(
    view!.nodes.map((n) => n.agent),
    ["Safety", "Router", "Planning", "Knowledge", "Concept", "Evaluation"],
  );

  const knowledge = view!.nodes.find((n) => n.agent === "Knowledge")!;
  assert.equal(knowledge.derived, true);
  assert.equal(knowledge.headline, "Concept resolved");

  const evaluation = view!.nodes.find((n) => n.agent === "Evaluation")!;
  assert.equal(evaluation.headline, "92/100");
  assert.equal(evaluation.raw.accuracy, 90);
  assert.equal(evaluation.raw.clarity, 91);

  assert.equal(view!.summary.errorCount, 0);
  assert.equal(view!.summary.totalLatencyMs, 200 + 600 + 180);
  assert.equal(view!.summary.totalInputTokens, 500 + 100);
});

test("a failed stage is counted as an error and surfaces its reason", () => {
  const events: EventRow[] = [
    row("message_received", { riskLevel: "Low", confidence: 0.99 }),
    row("routing_failed", { reason: "timeout", latencyMs: 50 }),
  ];

  const view = buildTraceView("trace-3", events);
  assert.ok(view);
  const router = view!.nodes.find((n) => n.agent === "Router")!;
  assert.equal(router.status, "failed");
  assert.equal(router.headline, "Failed");
  assert.deepEqual(router.details, [{ label: "Reason", value: "timeout" }]);
  assert.equal(view!.summary.errorCount, 1);
});

test("Planning and Memory never carry model/tokens/cost -- deterministic logic, not a Claude call", () => {
  const events: EventRow[] = [
    row("message_received", { riskLevel: "Low", confidence: 0.99 }),
    row("learning_plan_created", { strategy: "Diagnostic", difficulty: "Easy", pace: "Slow", conceptResolved: false }),
    row("learner_profile_updated", { conceptId: "c1", masteryScore: 0.8 }),
  ];

  const view = buildTraceView("trace-4", events);
  assert.ok(view);
  const planning = view!.nodes.find((n) => n.agent === "Planning")!;
  const memory = view!.nodes.find((n) => n.agent === "Memory")!;
  assert.equal(planning.model, undefined);
  assert.equal(memory.model, undefined);

  const knowledge = view!.nodes.find((n) => n.agent === "Knowledge")!;
  assert.equal(knowledge.headline, "No concept resolved");
});

const VOICE_ID = "11111111-2222-4333-8444-555555555555";

test("concept comes from the logged conceptId on the plan", () => {
  const view = buildTraceView("t-concept", [
    row("learning_plan_created", { strategy: "x", conceptResolved: true, conceptId: "c-1", conceptName: "Addition" }),
  ]);
  assert.deepEqual(view?.summary.concept, { status: "instrumented", conceptId: "c-1", conceptName: "Addition" });
});

test("a plan with a null conceptId is 'no concept', not 'not instrumented'", () => {
  const view = buildTraceView("t-none", [
    row("learning_plan_created", { strategy: "x", conceptResolved: false, conceptId: null, conceptName: null }),
  ]);
  assert.deepEqual(view?.summary.concept, { status: "no_concept" });
});

test("traces written before conceptId was logged are marked not instrumented", () => {
  const view = buildTraceView("t-old", [
    row("learning_plan_created", { strategy: "x", conceptResolved: true }),
    row("concept_explained", { model: "m", nextStep: "n" }),
  ]);
  assert.deepEqual(view?.summary.concept, { status: "not_instrumented" });
});

test("text-only turns have no voice view", () => {
  const view = buildTraceView("t-text", [row("reply_sent", { source: "tutor" })]);
  assert.equal(view?.voice, null);
});

test("voice view joins transcription and timing for the linked voice trace", () => {
  const view = buildTraceView(
    "t-voice",
    [row("reply_sent", { voiceTraceId: VOICE_ID })],
    [
      row("voice_transcription_completed", { latencyMs: 820, transcriptLength: 42, audioSeconds: 3.5 }),
      row("voice_turn_timing", {
        voiceTraceId: VOICE_ID,
        avatarStatus: "spoke",
        questionEndToTranscriptMs: 820,
        transcriptToReplyMs: 4100,
        replyStartToAvatarAudioMs: 1900,
        totalMs: 6900,
      }),
    ],
  );
  assert.deepEqual(view?.voice, {
    voiceTraceId: VOICE_ID,
    transcription: { status: "success", latencyMs: 820, transcriptLength: 42, audioSeconds: 3.5 },
    turnTiming: {
      avatarStatus: "spoke",
      questionEndToTranscriptMs: 820,
      transcriptToReplyMs: 4100,
      replyStartToAvatarAudioMs: 1900,
      totalMs: 6900,
    },
  });
});

test("a voice turn without a browser timing report keeps timing null rather than inventing it", () => {
  const view = buildTraceView(
    "t-voice-2",
    [row("reply_sent", { voiceTraceId: VOICE_ID })],
    [row("voice_transcription_completed", { latencyMs: 500 })],
  );
  assert.equal(view?.voice?.turnTiming, null);
  assert.equal(view?.voice?.transcription?.latencyMs, 500);
});

test("a malformed voiceTraceId is ignored", () => {
  assert.equal(findVoiceTraceId([row("reply_sent", { voiceTraceId: "not-a-uuid" })]), null);
  assert.equal(findVoiceTraceId([row("reply_sent", { voiceTraceId: VOICE_ID })]), VOICE_ID);
});

test("assessment and knowledge nodes say what is not instrumented", () => {
  const view = buildTraceView("t-gaps", [
    row("learning_plan_created", { strategy: "x", conceptResolved: true, conceptId: "c-1" }),
    row("assessment_completed", { masteryScore: 70, conceptId: "c-1" }),
  ]);
  const assessment = view?.nodes.find((n) => n.agent === "Assessment");
  const knowledge = view?.nodes.find((n) => n.agent === "Knowledge");
  assert.ok(assessment?.details.some((d) => d.label === "Per-question correctness" && d.value === "Not currently instrumented"));
  assert.ok(assessment?.details.some((d) => d.label === "Hints used" && d.value === "Not currently instrumented"));
  assert.ok(knowledge?.details.some((d) => d.value === "Not currently instrumented"));
});
