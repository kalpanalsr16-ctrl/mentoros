import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createTurnTiming, replyTimingFields } from "@/lib/chat/turn-timing";

function scriptedClock(...readings: number[]) {
  let i = 0;
  return () => readings[Math.min(i++, readings.length - 1)];
}

test("a segment's duration is the elapsed time between its start and end readings", async () => {
  const timing = createTurnTiming(scriptedClock(100, 250));
  await timing.measure("safetyMs", async () => "ok");
  const fields = timing.criticalPathFields(250).criticalPath;
  assert.equal(fields.safetyMs, 150);
});

test("a failed span records nothing and its error still reaches the caller", async () => {
  const timing = createTurnTiming(scriptedClock(0, 900));
  await assert.rejects(
    timing.measure("generationMs", async () => {
      throw new Error("upstream failed");
    }),
    /upstream failed/,
  );
  const fields = timing.criticalPathFields(900).criticalPath;
  assert.equal("generationMs" in fields, false);
});

test("a cancelled generation records no completed generation timing", async () => {
  const timing = createTurnTiming(scriptedClock(0, 4000));
  await assert.rejects(
    timing.measure("generationMs", async () => {
      throw new DOMException("aborted", "AbortError");
    }),
  );
  assert.equal("generationMs" in timing.criticalPathFields(4000).criticalPath, false);
});

test("measured work returns its value unchanged, including object identity and ordering of callbacks", async () => {
  const timing = createTurnTiming(scriptedClock(0, 10));
  const sent: string[] = [];
  const payload = { ok: true };
  const result = await timing.measure("generationMs", async () => {
    sent.push("a");
    sent.push("b");
    return payload;
  });
  assert.equal(result, payload);
  assert.deepEqual(sent, ["a", "b"]);
});

test("synchronous segments return their value unchanged", () => {
  const timing = createTurnTiming(scriptedClock(5, 8));
  const value = timing.measureSync("personalizationMs", () => ({ teachingStyle: "ExampleFirst" }));
  assert.deepEqual(value, { teachingStyle: "ExampleFirst" });
  assert.equal(timing.criticalPathFields(8).criticalPath.personalizationMs, 3);
});

test("telemetry writes are reported apart from segments, and failed writes add nothing", async () => {
  const timing = createTurnTiming(scriptedClock(0, 40, 40, 90, 90, 95));
  await timing.telemetry(async () => undefined);
  await assert.rejects(
    timing.telemetry(async () => {
      throw new Error("write failed");
    }),
  );
  const fields = timing.criticalPathFields(95).criticalPath;
  assert.equal(fields.telemetryWriteMs, 40);
  assert.equal("generationMs" in fields, false);
});

test("residual is the reply completion time minus every attributed span", async () => {
  // Production Concept turn de7cbbb6: the four measured stages from the trace.
  // Everything else, including the 7,937 ms of unmeasured time, must come out as residual.
  const timing = createTurnTiming(scriptedClock(3972, 5802, 6655, 8679, 8960, 12677, 13818, 20928));
  await timing.measure("safetyMs", async () => undefined);
  await timing.measure("routerMs", async () => undefined);
  await timing.measure("planningMs", async () => undefined);
  await timing.measure("generationMs", async () => undefined);
  const fields = timing.criticalPathFields(22618).criticalPath;
  assert.equal(fields.safetyMs, 1830);
  assert.equal(fields.routerMs, 2024);
  assert.equal(fields.planningMs, 3717);
  assert.equal(fields.generationMs, 7110);
  assert.equal(fields.residualMs, 22618 - 14681);
});

test("critical-path fields never overwrite the existing timing fields", () => {
  const timing = createTurnTiming(scriptedClock(0, 1));
  const existing = replyTimingFields({ replyCompletedMs: 22618, evaluationDeferred: true, firstContentMs: 22618 });
  const critical = timing.criticalPathFields(22618);
  assert.equal("replyCompletedMs" in critical.criticalPath, false);
  assert.equal("wallClockMs" in critical.criticalPath, false);
  assert.equal("firstContentMs" in critical.criticalPath, false);
  assert.equal(existing.replyCompletedMs, 22618);
  assert.equal("wallClockMs" in existing, false);
});

test("a structured Concept turn records every blocking segment it completed", async () => {
  const timing = createTurnTiming(scriptedClock(0, 1, 1, 2, 2, 3, 3, 9, 9, 12, 12, 17, 17, 20, 20, 21));
  await timing.measure("rateLimitMs", async () => undefined);
  await timing.measure("userInsertMs", async () => undefined);
  await timing.measure("historyMs", async () => undefined);
  await timing.measure("safetyMs", async () => undefined);
  await timing.measure("routerMs", async () => undefined);
  await timing.measure("planningMs", async () => undefined);
  await timing.measure("generationMs", async () => undefined);
  await timing.measure("persistMs", async () => undefined);
  const path = timing.criticalPathFields(21).criticalPath;
  for (const key of ["rateLimitMs", "userInsertMs", "historyMs", "safetyMs", "routerMs", "planningMs", "generationMs", "persistMs"]) {
    assert.ok(typeof path[key] === "number", `${key} should be recorded`);
  }
  assert.equal(path.criticalPathVersion, 1);
});

test("the pipeline and route are wired through the timed helper, not raw logEvent calls", () => {
  const route = readFileSync(new URL("../../src/app/api/chat/route.ts", import.meta.url), "utf8");
  const start = route.indexOf("export async function runTutoringPipeline(");
  const end = route.indexOf("\n}\n", start);
  const pipeline = route.slice(start, end);
  assert.equal(pipeline.includes("await logEvent(supabase"), false);
  assert.ok(pipeline.includes("await logTimed({"));
  assert.ok(route.includes("timing.criticalPathFields(replyCompletedMs)"));
});

test("the General streamed path keeps its first-content and completion fields unchanged", () => {
  const route = readFileSync(new URL("../../src/app/api/chat/route.ts", import.meta.url), "utf8");
  assert.ok(route.includes("generateTeachingReplyStreaming(history, teachingGuidance, (delta) => events.chunk(delta), signal)"));
  assert.ok(route.includes("firstContent.recordTextDelta(text);"));
});
