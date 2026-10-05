import { test } from "node:test";
import assert from "node:assert/strict";
import { timelineSegments } from "@/lib/observability/trace-timeline";
import type { AgentNodeView } from "@/lib/observability/transparency-provider";

function node(agent: string, latencyMs: number | null, derived = false): AgentNodeView {
  return { agent, status: "success", headline: "", latencyMs, details: [], raw: {}, derived };
}

test("measured stages are shares of their total that sum to 1", () => {
  const { segments, unmeasured } = timelineSegments([node("Safety", 1000), node("Router", 3000), node("Teaching", 6000)]);
  assert.deepEqual(
    segments.map((s) => [s.agent, s.share]),
    [["Safety", 0.1], ["Router", 0.3], ["Teaching", 0.6]],
  );
  assert.deepEqual(unmeasured, []);
  assert.equal(segments.reduce((sum, s) => sum + s.share, 0), 1);
});

test("stages without measured latency are named, not given a made-up duration", () => {
  const { segments, unmeasured } = timelineSegments([node("Router", 500), node("Planning", null), node("Memory", null)]);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].share, 1);
  assert.deepEqual(unmeasured, ["Planning", "Memory"]);
});

test("derived Knowledge node is never listed as unmeasured", () => {
  const { unmeasured } = timelineSegments([node("Knowledge", null, true)]);
  assert.deepEqual(unmeasured, []);
});

test("no measured latency yields no segments", () => {
  assert.deepEqual(timelineSegments([node("Planning", null)]), { segments: [], unmeasured: ["Planning"] });
  assert.deepEqual(timelineSegments([]), { segments: [], unmeasured: [] });
});
