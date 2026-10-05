import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTraceView, terminalWallClockMs, traceOutcome } from "@/lib/observability/transparency-provider";
import { sanitizePayload } from "@/lib/voice/voice-event-payload";
import { logEvent, setObservabilityFailureReporter } from "@/lib/observability/trace";
import type { EventRow } from "@/lib/agents/observability-agent";

const VOICE_ID = "11111111-2222-4333-8444-555555555555";
const INFERENCE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function row(eventName: string, payload: Record<string, unknown> = {}): EventRow {
  return { event_name: eventName, payload, created_at: "2026-10-05T10:00:00Z", conversation_id: "c", student_id: "s" };
}

test("completed turns are classified from their terminal reply event", () => {
  assert.equal(traceOutcome([row("reply_sent", { wallClockMs: 9000 })]), "completed");
  assert.equal(traceOutcome([row("safety_reply_sent", {})]), "completed");
});

test("a cancelled turn is its own outcome, never an error", () => {
  const events = [row("intent_detected", { latencyMs: 2000 }), row("turn_cancelled", { wallClockMs: 4100 })];
  assert.equal(traceOutcome(events), "cancelled");
  assert.equal(traceOutcome(events.filter((e) => e.event_name !== "reply_failed")), "cancelled");
  assert.equal(terminalWallClockMs(events), 4100);
});

test("an errored turn is classified as errored", () => {
  assert.equal(traceOutcome([row("reply_failed", { reason: "pipeline_exception", wallClockMs: 3000 })]), "errored");
});

test("traces written before E1 report unknown outcome and no wall-clock, not a guess", () => {
  const events = [row("intent_detected", { latencyMs: 2000 }), row("reply_sent", {})];
  assert.equal(traceOutcome(events), "completed");
  assert.equal(terminalWallClockMs(events), null);
});

test("wall-clock is separate from the stage sum", () => {
  const view = buildTraceView("t", [
    row("intent_detected", { latencyMs: 2000 }),
    row("concept_explained", { latencyMs: 10000 }),
    row("reply_sent", { wallClockMs: 17500 }),
  ]);
  assert.equal(view?.summary.stageLatencySumMs, 12000);
  assert.equal(view?.summary.wallClockMs, 17500);
  assert.equal(view?.summary.outcome, "completed");
});

test("planning duration is shown from its own event rather than left unmeasured", () => {
  const view = buildTraceView("t", [
    row("learning_plan_created", { strategy: "Guided", conceptId: "c-1", conceptName: "Addition", latencyMs: 640 }),
  ]);
  const planning = view?.nodes.find((n) => n.agent === "Planning");
  assert.equal(planning?.latencyMs, 640);
  assert.equal(view?.summary.stageLatencySumMs, 640);
});

test("a failed planning stage keeps its duration without becoming a success", () => {
  const view = buildTraceView("t", [row("planning_failed", { reason: "boom", latencyMs: 300 })]);
  const planning = view?.nodes.find((n) => n.agent === "Planning");
  assert.equal(planning?.status, "failed");
  assert.equal(planning?.latencyMs, 300);
});

test("avatar speaking events keep only validated voice, conversation, and inference IDs", () => {
  assert.deepEqual(
    sanitizePayload("avatar_speaking_started", {
      voiceTraceId: VOICE_ID,
      conversationId: "c_abc-123",
      inferenceId: INFERENCE_ID,
      transcript: "must not survive",
    }),
    { voiceTraceId: VOICE_ID, conversationId: "c_abc-123", inferenceId: INFERENCE_ID },
  );
});

test("malformed avatar identifiers are nulled, not stored", () => {
  assert.deepEqual(
    sanitizePayload("avatar_speaking_started", {
      voiceTraceId: "not-a-uuid",
      conversationId: "has spaces and ;drop",
      inferenceId: 42,
    }),
    { voiceTraceId: null, conversationId: null, inferenceId: null },
  );
});

test("voice timing still rejects unknown avatar statuses", () => {
  assert.equal(sanitizePayload("voice_turn_timing", { avatarStatus: "bogus" }), null);
});

function fakeClient(result: { error: { message: string } | null } | Error) {
  const inserts: unknown[] = [];
  return {
    inserts,
    client: {
      from: () => ({
        insert: (row: unknown) => {
          inserts.push(row);
          if (result instanceof Error) return Promise.reject(result);
          return Promise.resolve(result);
        },
      }),
    } as unknown as Parameters<typeof logEvent>[0],
  };
}

async function quietly<T>(fn: () => Promise<T>): Promise<{ value: T; errors: unknown[][]; reports: string[] }> {
  const original = console.error;
  const errors: unknown[][] = [];
  const reports: string[] = [];
  console.error = (...args: unknown[]) => {
    errors.push(args);
  };
  setObservabilityFailureReporter((eventName) => reports.push(eventName));
  try {
    return { value: await fn(), errors, reports };
  } finally {
    console.error = original;
    setObservabilityFailureReporter(null);
  }
}

test("a successful event write inserts the row unchanged", async () => {
  const { client, inserts } = fakeClient({ error: null });
  await logEvent(client, { traceId: "t1", eventName: "turn_cancelled", studentId: "s1", conversationId: "c1", payload: { wallClockMs: 5 } });
  assert.deepEqual(inserts, [
    { trace_id: "t1", event_name: "turn_cancelled", student_id: "s1", conversation_id: "c1", payload: { wallClockMs: 5 } },
  ]);
});

test("a rejected write is reported, and never throws into the tutoring turn", async () => {
  const { client } = fakeClient({ error: { message: "permission denied" } });
  const { errors, reports } = await quietly(() =>
    logEvent(client, { traceId: "t", eventName: "reply_sent", studentId: "s" }),
  );
  assert.equal(errors.length, 1);
  assert.equal(errors[0][0], '[events] failed to log "reply_sent":');
  assert.deepEqual(reports, ["reply_sent"]);
});

test("a thrown exception from the writer is contained, not propagated", async () => {
  const { client } = fakeClient(new Error("network down"));
  const { value, errors, reports } = await quietly(async () => {
    await logEvent(client, { traceId: "t", eventName: "reply_sent", studentId: "s" });
    return "continued";
  });
  assert.equal(value, "continued");
  assert.equal(errors.length, 1);
  assert.deepEqual(reports, ["reply_sent"]);
});
