import { test } from "node:test";
import assert from "node:assert/strict";
import {
  groupIntoRecentTraces,
  filterRecentTraces,
  computeSummaryStats,
  buildTrendPoints,
  type EventRowWithTrace,
  type RecentTrace,
} from "@/lib/observability/recent-traces-aggregation";

function event(overrides: Partial<EventRowWithTrace>): EventRowWithTrace {
  return {
    trace_id: "trace-1",
    event_name: "concept_explained",
    payload: {},
    created_at: "2026-07-01T00:00:00Z",
    conversation_id: "conv-1",
    student_id: "student-1",
    ...overrides,
  };
}

test("groupIntoRecentTraces buckets events by trace_id and derives each trace's earliest timestamp", () => {
  const events: EventRowWithTrace[] = [
    event({ trace_id: "t1", created_at: "2026-07-01T10:00:00Z", event_name: "concept_explained" }),
    event({ trace_id: "t1", created_at: "2026-07-01T09:00:00Z", event_name: "message_received" }),
    event({ trace_id: "t2", created_at: "2026-07-02T00:00:00Z", event_name: "practice_generated" }),
  ];
  const traces = groupIntoRecentTraces(events);
  assert.equal(traces.length, 2);
  const t1 = traces.find((t) => t.traceId === "t1")!;
  assert.equal(t1.timestamp, "2026-07-01T09:00:00Z");
});

test("groupIntoRecentTraces sorts most-recent-first", () => {
  const events: EventRowWithTrace[] = [
    event({ trace_id: "older", created_at: "2026-07-01T00:00:00Z" }),
    event({ trace_id: "newer", created_at: "2026-07-05T00:00:00Z" }),
  ];
  const traces = groupIntoRecentTraces(events);
  assert.deepEqual(traces.map((t) => t.traceId), ["newer", "older"]);
});

function trace(overrides: Partial<RecentTrace>): RecentTrace {
  return {
    traceId: "t1",
    conversationId: "c1",
    studentId: "s1",
    workflow: "Concept Learning",
    totalLatencyMs: 1000,
    totalInputTokens: 100,
    totalOutputTokens: 50,
    estimatedCostUsd: 0.01,
    errorCount: 0,
    agentExecutions: [],
    timestamp: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

test("filterRecentTraces filters by workflow", () => {
  const traces = [trace({ traceId: "a", workflow: "Practice" }), trace({ traceId: "b", workflow: "Assessment" })];
  const result = filterRecentTraces(traces, { workflow: "Practice" });
  assert.deepEqual(result.map((t) => t.traceId), ["a"]);
});

test("filterRecentTraces filters to errors-only", () => {
  const traces = [trace({ traceId: "clean", errorCount: 0 }), trace({ traceId: "broken", errorCount: 2 })];
  const result = filterRecentTraces(traces, { errorsOnly: true });
  assert.deepEqual(result.map((t) => t.traceId), ["broken"]);
});

test("computeSummaryStats computes total interactions, average latency (ignoring nulls), and error rate", () => {
  const traces = [
    trace({ totalLatencyMs: 1000, errorCount: 0 }),
    trace({ totalLatencyMs: 3000, errorCount: 1 }),
    trace({ totalLatencyMs: null, errorCount: 0 }),
  ];
  const stats = computeSummaryStats(traces);
  assert.equal(stats.totalInteractions, 3);
  assert.equal(stats.averageLatencyMs, 2000);
  assert.equal(stats.errorRate, 1 / 3);
});

test("computeSummaryStats handles zero traces without dividing by zero", () => {
  const stats = computeSummaryStats([]);
  assert.deepEqual(stats, { totalInteractions: 0, averageLatencyMs: null, errorRate: 0 });
});

test("buildTrendPoints drops traces with no value for the metric and sorts chronologically", () => {
  const traces = [
    trace({ timestamp: "2026-07-05T00:00:00Z", totalLatencyMs: 500 }),
    trace({ timestamp: "2026-07-01T00:00:00Z", totalLatencyMs: 1000 }),
    trace({ timestamp: "2026-07-03T00:00:00Z", totalLatencyMs: null }),
  ];
  const points = buildTrendPoints(traces, "latency");
  assert.deepEqual(points, [
    { timestamp: "2026-07-01T00:00:00Z", value: 1000 },
    { timestamp: "2026-07-05T00:00:00Z", value: 500 },
  ]);
});

test("buildTrendPoints reads estimatedCostUsd for the cost metric", () => {
  const traces = [trace({ timestamp: "2026-07-01T00:00:00Z", estimatedCostUsd: 0.05 })];
  const points = buildTrendPoints(traces, "cost");
  assert.deepEqual(points, [{ timestamp: "2026-07-01T00:00:00Z", value: 0.05 }]);
});
