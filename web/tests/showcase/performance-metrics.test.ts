import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COST_BASIS,
  MEDIAN_MIN_N,
  P90_MIN_N,
  composition,
  economics,
  interpretations,
  latencyByStage,
  reliability,
  sampleStats,
  textVsVoiceStageSum,
  trafficCounts,
  voice,
  wallClock,
  type PerfRow,
} from "@/lib/showcase/performance/performance-metrics";

function row(over: Partial<PerfRow>): PerfRow {
  return {
    traceId: "t",
    eventName: "intent_detected",
    createdAt: "2026-10-05T10:00:00Z",
    traffic: "other",
    model: null,
    latencyMs: null,
    inputTokens: null,
    outputTokens: null,
    wallClockMs: null,
    modality: null,
    voiceQuestionToTranscriptMs: null,
    voiceTranscriptToReplyMs: null,
    voiceReplyToAudioMs: null,
    voiceTotalMs: null,
    avatarStatus: null,
    ...over,
  };
}

const llm = (over: Partial<PerfRow>) => row({ model: "claude-opus-4-8", inputTokens: 1000, outputTokens: 200, ...over });

test("below the median threshold, only the observed range is shown", () => {
  const stats = sampleStats([100, 200, 300]);
  assert.equal(stats.n, 3);
  assert.equal(stats.min, 100);
  assert.equal(stats.max, 300);
  assert.equal(stats.median, null);
  assert.equal(stats.p90, null);
});

test("median appears at the documented threshold, and p90 only at its own threshold", () => {
  const thirty = Array.from({ length: MEDIAN_MIN_N }, (_, i) => i + 1);
  assert.equal(sampleStats(thirty).median, 15);
  assert.equal(sampleStats(thirty).p90, null);
  const fifty = Array.from({ length: P90_MIN_N }, (_, i) => i + 1);
  assert.equal(sampleStats(fifty).p90, 45);
});

test("no values gives no statistic rather than a zero", () => {
  assert.deepEqual(sampleStats([]), { n: 0, min: null, max: null, median: null, p90: null });
});

test("benchmark and AI Tutor automatic turns never enter student metrics", () => {
  const rows = [
    row({ eventName: "intent_detected", latencyMs: 2000 }),
    row({ eventName: "intent_detected", latencyMs: 999999, traffic: "benchmark" }),
    row({ eventName: "intent_detected", latencyMs: 888888, traffic: "tutor_auto" }),
  ];
  assert.equal(latencyByStage(rows).find((s) => s.key === "router")?.stats.n, 1);
  const counts = trafficCounts(rows);
  assert.equal(counts.rowsRead, 3);
  assert.equal(counts.benchmarkTraces, 1);
});

test("composition shares sum to one and cover only measured core stages", () => {
  const rows = [
    row({ eventName: "intent_detected", latencyMs: 2000 }),
    row({ eventName: "concept_explained", latencyMs: 8000, model: "claude-opus-4-8", inputTokens: 1, outputTokens: 1 }),
    row({ eventName: "voice_transcription_completed", latencyMs: 5000 }),
  ];
  const share = composition(rows);
  assert.ok(!share.some((s) => s.key === "stt"), "speech-to-text is not a core stage");
  assert.equal(share.reduce((acc, s) => acc + s.share, 0).toFixed(6), "1.000000");
  assert.equal(share.find((s) => s.key === "concept")?.share, 0.8);
});

test("a stage with no measured duration is absent rather than given a made-up one", () => {
  assert.deepEqual(composition([row({ eventName: "learning_plan_created", latencyMs: null })]), []);
});

test("cost is labelled as an estimate from token counts, never as billing", () => {
  const view = economics([llm({ eventName: "concept_explained" })]);
  assert.equal(view.costBasis, COST_BASIS);
  assert.match(view.costBasis, /not provider billing/);
  assert.equal(view.models[0].model, "claude-opus-4-8");
});

test("an unknown model is reported as unpriced, never costed", () => {
  const view = economics([
    llm({ eventName: "concept_explained", model: "future-model" }),
    llm({ eventName: "intent_detected" }),
  ]);
  const unknown = view.models.find((m) => m.model === "future-model");
  assert.equal(unknown?.priced, false);
  assert.equal(unknown?.estimatedCostUsd, null);
  assert.equal(view.unpricedCalls, 1);
  assert.equal(view.byStage.find((s) => s.key === "concept")?.estimatedCostUsd, null);
});

test("per-turn cost is shown only for turns whose every model call is priced", () => {
  const rows = [
    llm({ eventName: "intent_detected", traceId: "priced" }),
    llm({ eventName: "concept_explained", traceId: "priced" }),
    llm({ eventName: "intent_detected", traceId: "mixed" }),
    llm({ eventName: "concept_explained", traceId: "mixed", model: "future-model" }),
  ];
  assert.equal(economics(rows).perTurn.n, 1);
});

test("token totals are the sum of provider-reported counts", () => {
  const view = economics([
    llm({ eventName: "intent_detected", inputTokens: 100, outputTokens: 10 }),
    llm({ eventName: "concept_explained", inputTokens: 300, outputTokens: 30 }),
  ]);
  assert.equal(view.models[0].inputTokens, 400);
  assert.equal(view.models[0].outputTokens, 40);
  assert.equal(view.models[0].totalTokens, 440);
});

test("voice timing is reported only from ordinary voice turns, with its own n", () => {
  const rows = [
    row({ eventName: "voice_turn_timing", voiceTranscriptToReplyMs: 14000, voiceReplyToAudioMs: 1500, avatarStatus: "spoke" }),
    row({ eventName: "voice_turn_timing", voiceTranscriptToReplyMs: 9000, voiceReplyToAudioMs: 1200, avatarStatus: "failed" }),
    row({ eventName: "voice_turn_timing", traffic: "benchmark", voiceTranscriptToReplyMs: 1 }),
  ];
  const v = voice(rows);
  assert.equal(v.transcriptToReply.n, 2);
  assert.equal(v.transcriptToReply.median, null);
  assert.deepEqual(v.avatarStatuses, { spoke: 1, failed: 1 });
});

test("text versus voice compares measured stage sums per turn, excluding turns without a modality", () => {
  const rows = [
    row({ traceId: "a", eventName: "concept_explained", latencyMs: 10000 }),
    row({ traceId: "a", eventName: "reply_sent", modality: "text", wallClockMs: 12000 }),
    row({ traceId: "b", eventName: "concept_explained", latencyMs: 4000 }),
    row({ traceId: "b", eventName: "reply_sent", modality: "voice", wallClockMs: 5000 }),
    row({ traceId: "c", eventName: "concept_explained", latencyMs: 7000 }),
  ];
  const cmp = textVsVoiceStageSum(rows);
  assert.equal(cmp.text.n, 1);
  assert.equal(cmp.voice.n, 1);
  assert.equal(cmp.text.min, 10000);
  assert.equal(cmp.voice.min, 4000);
});

test("wall-clock with two samples shows the observed values, not statistics", () => {
  const view = wallClock([
    row({ eventName: "reply_sent", wallClockMs: 20000 }),
    row({ eventName: "turn_cancelled", wallClockMs: 6721 }),
  ]);
  assert.equal(view.stats.n, 2);
  assert.equal(view.stats.median, null);
  assert.deepEqual([...view.observed].sort((a, b) => a - b), [6721, 20000]);
});

test("reliability returns counts with no percentages", () => {
  const r = reliability([
    row({ eventName: "reply_sent" }),
    row({ eventName: "reply_sent", traffic: "benchmark" }),
    row({ eventName: "turn_cancelled" }),
    row({ eventName: "reply_failed" }),
  ]);
  assert.deepEqual(
    { completed: r.completed, errored: r.errored, cancelled: r.cancelled },
    { completed: 1, errored: 1, cancelled: 1 },
  );
  for (const value of Object.values(r)) assert.equal(typeof value, "number");
});

test("interpretations appear only when the sample policy is met", () => {
  const turns = (count: number) =>
    Array.from({ length: count }, (_, i) => [
      row({ traceId: `t${i}`, eventName: "intent_detected", latencyMs: 1000 }),
      row({ traceId: `t${i}`, eventName: "concept_explained", latencyMs: 9000 }),
    ]).flat();
  assert.deepEqual(interpretations(turns(MEDIAN_MIN_N - 1)), []);
  const notes = interpretations(turns(MEDIAN_MIN_N));
  assert.equal(notes.length, 1);
  assert.match(notes[0].text, /that call is the longest measured stage/);
  assert.match(notes[0].basis, /n=30/);
});

test("the Concept conclusion is not drawn when Concept is not the longest stage", () => {
  const turns = Array.from({ length: MEDIAN_MIN_N }, (_, i) => [
    row({ traceId: `t${i}`, eventName: "safety_blocked", latencyMs: 1000 }),
    row({ traceId: `t${i}`, eventName: "concept_explained", latencyMs: 500 }),
  ]).flat();
  assert.deepEqual(interpretations(turns), []);
});
