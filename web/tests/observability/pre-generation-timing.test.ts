import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CRITICAL_PATH_VERSION,
  TIMING_FIELDS_VERSION,
  createTurnTiming,
  responseDoneFields,
  type GenerationAgent,
} from "@/lib/chat/turn-timing";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const IDENTITY = { authMs: 42, deployCommit: "abc1234" };

function clock() {
  let now = 0;
  return { now: () => now, advance: (ms: number) => void (now += ms) };
}

function occurrencesAfter(source: string, needle: string): string[] {
  const blocks: string[] = [];
  let at = source.indexOf(needle);
  while (at !== -1) {
    blocks.push(source.slice(at, source.indexOf("});", at)));
    at = source.indexOf(needle, at + 1);
  }
  return blocks;
}

test("preGenerationMs is the existing turn clock at the generation boundary", async () => {
  const c = clock();
  const timing = createTurnTiming(c.now, IDENTITY);
  await timing.measure("rateLimitMs", async () => c.advance(200));
  c.advance(300);
  timing.markGenerationStart("Concept");
  const fields = timing.instrumentationFields();
  assert.equal(fields.preGenerationMs, 500);
  assert.equal(fields.generationAgent, "Concept");
});

test("the first generation boundary wins: a turn has one final generation call", () => {
  const c = clock();
  const timing = createTurnTiming(c.now, IDENTITY);
  c.advance(500);
  timing.markGenerationStart("Concept");
  c.advance(400);
  timing.markGenerationStart("Practice");
  const fields = timing.instrumentationFields();
  assert.equal(fields.preGenerationMs, 500);
  assert.equal(fields.generationAgent, "Concept");
});

test("Practice, Assessment, Concept, and General all use the same boundary rule", () => {
  const agents: GenerationAgent[] = ["Concept", "Practice", "Assessment", "General"];
  for (const agent of agents) {
    const c = clock();
    const timing = createTurnTiming(c.now, IDENTITY);
    c.advance(730);
    timing.markGenerationStart(agent);
    const fields = timing.instrumentationFields();
    assert.equal(fields.preGenerationMs, 730, agent);
    assert.equal(fields.generationAgent, agent);
  }
});

test("turns that never begin generation get no preGenerationMs and no agent", () => {
  const c = clock();
  const timing = createTurnTiming(c.now, IDENTITY);
  c.advance(900);
  const fields = timing.instrumentationFields();
  assert.equal("preGenerationMs" in fields, false, "clarification, decline, and safety-blocked turns fabricate nothing");
  assert.equal("generationAgent" in fields, false);
  assert.equal("preGenerationResidualMs" in fields, false);
});

test("telemetry writes before generation are pre, writes after are post, and they sum to telemetryWriteMs", async () => {
  const c = clock();
  const timing = createTurnTiming(c.now, IDENTITY);
  await timing.telemetry(async () => c.advance(40));
  await timing.telemetry(async () => c.advance(60));
  timing.markGenerationStart("Practice");
  await timing.telemetry(async () => c.advance(25));
  const fields = timing.instrumentationFields();
  const total = timing.criticalPathFields(c.now()).criticalPath.telemetryWriteMs;
  assert.equal(fields.preGenerationTelemetryWriteMs, 100);
  assert.equal(fields.postGenerationTelemetryWriteMs, 25);
  assert.equal(total, 125);
  assert.equal(Number(fields.preGenerationTelemetryWriteMs) + Number(fields.postGenerationTelemetryWriteMs), total);
});

test("without a generation boundary, every telemetry write is counted as pre-generation", async () => {
  const c = clock();
  const timing = createTurnTiming(c.now, IDENTITY);
  await timing.telemetry(async () => c.advance(33));
  const fields = timing.instrumentationFields();
  assert.equal(fields.preGenerationTelemetryWriteMs, 33);
  assert.equal(fields.postGenerationTelemetryWriteMs, 0);
});

test("pre-generation residual reconciles under the sequential-span rule", async () => {
  const c = clock();
  const timing = createTurnTiming(c.now, IDENTITY);
  await timing.measure("rateLimitMs", async () => c.advance(120));
  await timing.measure("safetyMs", async () => c.advance(800));
  await timing.telemetry(async () => c.advance(50));
  c.advance(30);
  timing.markGenerationStart("Concept");
  const fields = timing.instrumentationFields();
  const reconciled = 120 + 800 + Number(fields.preGenerationTelemetryWriteMs) + Number(fields.preGenerationResidualMs);
  assert.equal(reconciled, Number(fields.preGenerationMs));
  assert.equal(fields.preGenerationResidualMs, 30);
});

test("generation work after the boundary does not enter the pre-generation residual", async () => {
  const c = clock();
  const timing = createTurnTiming(c.now, IDENTITY);
  c.advance(200);
  timing.markGenerationStart("Concept");
  await timing.measure("generationMs", async () => c.advance(7000));
  const fields = timing.instrumentationFields();
  assert.equal(fields.preGenerationMs, 200);
  assert.equal(fields.preGenerationResidualMs, 200);
});

test("cancelled turn after generation start retains preGeneration timing on the terminal event", async () => {
  const c = clock();
  const timing = createTurnTiming(c.now, IDENTITY);
  await timing.measure("rateLimitMs", async () => c.advance(100));
  await timing.telemetry(async () => c.advance(20));
  c.advance(60);
  timing.markGenerationStart("Concept");
  await timing.telemetry(async () => c.advance(15));
  const terminal = timing.terminalTimingFields();
  assert.deepEqual(terminal, {
    timingFieldsVersion: 2,
    authMs: 42,
    deployCommit: "abc1234",
    preGenerationMs: 180,
    generationAgent: "Concept",
    preGenerationTelemetryWriteMs: 20,
    preGenerationResidualMs: 60,
  });
});

test("failed turn after generation start (General) retains preGeneration timing on the terminal event", () => {
  const c = clock();
  const timing = createTurnTiming(c.now, IDENTITY);
  c.advance(410);
  timing.markGenerationStart("General");
  const terminal = timing.terminalTimingFields();
  assert.equal(terminal.preGenerationMs, 410);
  assert.equal(terminal.generationAgent, "General");
  assert.equal(terminal.timingFieldsVersion, TIMING_FIELDS_VERSION);
});

test("terminal fields omit post-generation totals, which would be incomplete when written", async () => {
  const c = clock();
  const timing = createTurnTiming(c.now, IDENTITY);
  timing.markGenerationStart("Concept");
  await timing.telemetry(async () => c.advance(99));
  const terminal = timing.terminalTimingFields();
  assert.equal("postGenerationTelemetryWriteMs" in terminal, false);
  assert.equal("preGenerationTelemetryWriteMs" in terminal, true);
});

test("failure before generation fabricates no preGeneration fields on the terminal event", async () => {
  const c = clock();
  const timing = createTurnTiming(c.now, IDENTITY);
  await timing.measure("rateLimitMs", async () => c.advance(100));
  await timing.telemetry(async () => c.advance(10));
  assert.deepEqual(timing.terminalTimingFields(), {});
});

test("authMs is identity, not a turn-clock or criticalPath field", () => {
  const c = clock();
  const timing = createTurnTiming(c.now, IDENTITY);
  timing.markGenerationStart("Concept");
  const { criticalPath } = timing.criticalPathFields(c.now());
  assert.equal("authMs" in criticalPath, false);
  assert.equal(timing.instrumentationFields().authMs, 42);
});

test("an unmeasured identity is reported as null, never as a fabricated number", () => {
  const timing = createTurnTiming(clock().now);
  assert.equal(timing.instrumentationFields().authMs, null);
  assert.equal(timing.instrumentationFields().deployCommit, null);
});

test("the criticalPath object and criticalPathVersion 1 are unchanged by the new fields", async () => {
  const c = clock();
  const timing = createTurnTiming(c.now, IDENTITY);
  await timing.measure("generationMs", async () => c.advance(100));
  timing.markGenerationStart("General");
  await timing.telemetry(async () => c.advance(10));
  const { criticalPath } = timing.criticalPathFields(c.now());
  assert.equal(CRITICAL_PATH_VERSION, 1);
  assert.equal(criticalPath.criticalPathVersion, 1);
  assert.deepEqual(Object.keys(criticalPath).sort(), ["criticalPathVersion", "generationMs", "residualMs", "telemetryWriteMs"]);
});

test("successful reply_sent fields: exact key set with generation, and no generation keys without it", () => {
  const withGeneration = createTurnTiming(clock().now, IDENTITY);
  withGeneration.markGenerationStart("Practice");
  assert.deepEqual(Object.keys(withGeneration.instrumentationFields()).sort(), [
    "authMs",
    "deployCommit",
    "generationAgent",
    "postGenerationTelemetryWriteMs",
    "preGenerationMs",
    "preGenerationResidualMs",
    "preGenerationTelemetryWriteMs",
    "timingFieldsVersion",
  ]);
  const withoutGeneration = createTurnTiming(clock().now, IDENTITY);
  assert.deepEqual(Object.keys(withoutGeneration.instrumentationFields()).sort(), [
    "authMs",
    "deployCommit",
    "postGenerationTelemetryWriteMs",
    "preGenerationTelemetryWriteMs",
    "timingFieldsVersion",
  ]);
});

test("responseDoneMs includes the awaited reply_sent delay, and replyCompletedMs is not redefined", () => {
  const payload = responseDoneFields({ replyCompletedMs: 16_768, responseDoneMs: 17_540 });
  assert.equal(payload.responseDoneMs, 17_540);
  assert.equal(payload.postReplyCompletionMs, 772);
  assert.equal("replyCompletedMs" in payload, false);
});

test("route: authentication is measured before turnStartedAt, and identity is passed to the timer", () => {
  const route = read("../../src/app/api/chat/route.ts");
  const authStart = route.indexOf("const authStartedAt = Date.now();");
  const createClientAt = route.indexOf("await createClient();");
  const claimsAt = route.indexOf("await supabase.auth.getClaims();");
  const authMsAt = route.indexOf("const authMs = Date.now() - authStartedAt;");
  const turnStartAt = route.indexOf("const turnStartedAt = Date.now();");
  const timingAt = route.indexOf("const timing = createTurnTiming(elapsedMs, {");
  assert.ok(authStart > 0 && authStart < createClientAt);
  assert.ok(createClientAt < claimsAt && claimsAt < authMsAt && authMsAt < turnStartAt);
  assert.ok(turnStartAt < timingAt);
  assert.ok(route.slice(timingAt, timingAt + 120).includes("authMs,"));
});

test("route: every generation call is preceded by its boundary mark, in the same order as before", () => {
  const route = read("../../src/app/api/chat/route.ts");
  const measure = 'timing.measure("generationMs"';
  const markPrefix = 'timing.markGenerationStart("';
  const expected = ["Practice", "Assessment", "Concept", "Concept", "General"];
  const measureIndexes: number[] = [];
  let at = route.indexOf(measure);
  while (at !== -1) {
    measureIndexes.push(at);
    at = route.indexOf(measure, at + 1);
  }
  assert.equal(measureIndexes.length, expected.length);
  const agents = measureIndexes.map((index) => {
    const mark = route.lastIndexOf(markPrefix, index);
    assert.ok(mark > 0 && index - mark < 200, "a mark immediately precedes the generation call");
    return route.slice(mark + markPrefix.length, route.indexOf('")', mark));
  });
  assert.deepEqual(agents, expected);
});

test("route: response timing is captured right before done, after the awaited reply_sent write", () => {
  const route = read("../../src/app/api/chat/route.ts");
  const replyCompletedAt = route.indexOf("const replyCompletedMs = elapsedMs();");
  const replySentAt = route.indexOf('eventName: pipelineResult.safe ? "reply_sent" : "safety_reply_sent"');
  const responseDoneAt = route.indexOf("const responseDoneMs = elapsedMs();");
  const doneAt = route.indexOf("events.done({");
  assert.ok(replyCompletedAt > 0 && replyCompletedAt < replySentAt);
  assert.ok(replySentAt < responseDoneAt && responseDoneAt < doneAt);
  const between = route.slice(replySentAt, responseDoneAt);
  assert.equal((between.match(/await logEvent\(/g) ?? []).length, 0);
});

test("route: response_done is registered after done and after Evaluation scheduling, and is not awaited", () => {
  const route = read("../../src/app/api/chat/route.ts");
  const doneAt = route.indexOf("events.done({");
  const evaluationAt = route.indexOf("scheduleDeferredEvaluation(supabase, pipelineResult.deferredEvaluation);");
  const responseDoneAt = route.indexOf('eventName: "response_done"');
  const afterAt = route.lastIndexOf("after(() =>", responseDoneAt);
  assert.ok(doneAt < evaluationAt && evaluationAt < afterAt && afterAt < responseDoneAt);
  assert.equal(route.slice(afterAt - 10, afterAt).includes("await"), false);
});

test("route: terminal events carry the terminal timing fields, and reply_sent carries the full set", () => {
  const route = read("../../src/app/api/chat/route.ts");
  const terminalNames = ["turn_cancelled", "reply_failed"];
  for (const name of terminalNames) {
    const blocks = occurrencesAfter(route, `eventName: "${name}"`);
    assert.ok(blocks.length >= 2, `${name} is written on at least two terminal paths`);
    for (const block of blocks) {
      assert.ok(block.includes("...timing.terminalTimingFields()"), `${name} carries terminal timing`);
    }
  }
  // Two writes exist. The streamed one ends the turn (no reply is saved), so it is terminal.
  // The non-streamed one is followed by the fallback reply, which writes reply_sent with the full set, so it is not.
  const conceptFailure = occurrencesAfter(route, 'eventName: "concept_explanation_failed"');
  assert.equal(conceptFailure.length, 2);
  assert.ok(conceptFailure[0].includes("...timing.terminalTimingFields()"), "streamed failure ends the turn and carries terminal timing");
  assert.equal(conceptFailure[1].includes("terminalTimingFields"), false, "non-streamed failure continues to a saved fallback reply");
  assert.ok(route.includes("...timing.instrumentationFields(),"), "reply_sent carries the full set");
});

test("no new awaited telemetry: the write counts match HEAD and response_done stays unawaited", () => {
  const route = read("../../src/app/api/chat/route.ts");
  assert.equal((route.match(/await logTimed\(/g) ?? []).length, 18);
  assert.equal((route.match(/await logEvent\(/g) ?? []).length, 9);
  assert.equal((route.match(/after\(\(\) =>/g) ?? []).length, 1);
  assert.equal((route.match(/terminalTimingFields\(\)/g) ?? []).length, 5);
});

test("C2: both Concept arms keep their own boundary, the arm rule is unchanged, and the failure event stays logged", () => {
  const route = read("../../src/app/api/chat/route.ts");
  const streamedBranch = route.indexOf('if (conceptStreamingArm === "treatment" && onConceptText) {');
  const streamedMark = route.indexOf('timing.markGenerationStart("Concept");', streamedBranch);
  const streamedMeasure = route.indexOf('conceptStreamOutcome = await timing.measure("generationMs"', streamedBranch);
  const controlMark = route.indexOf('timing.markGenerationStart("Concept");', streamedMeasure);
  const controlMeasure = route.indexOf('conceptResult = await timing.measure("generationMs"', streamedMeasure);
  assert.ok(streamedBranch > 0 && streamedMark > streamedBranch && streamedMark < streamedMeasure);
  assert.ok(controlMark > streamedMeasure && controlMark < controlMeasure);
  const failure = occurrencesAfter(route, 'eventName: "concept_explanation_failed"')[0];
  assert.ok(failure.includes("conceptStreamingArm,") && failure.includes("conceptStreaming: 1"));
});
