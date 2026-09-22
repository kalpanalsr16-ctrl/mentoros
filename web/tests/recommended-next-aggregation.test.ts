import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRecommendedNext } from "@/lib/recommended-next/recommended-next-aggregation";
import type { RevisionQueueItem } from "@/lib/revision/revision-queue-aggregation";

const now = new Date("2026-02-22T00:00:00Z");

function item(overrides: Partial<RevisionQueueItem>): RevisionQueueItem {
  return {
    conceptId: "a",
    conceptName: "Subtraction with regrouping",
    masteryScore: 0.4,
    retentionScore: 0.4,
    lastPracticedAt: null,
    commonMistakes: [],
    reason: "Struggling with related questions",
    tier: "reviewNow",
    ...overrides,
  };
}

test("picks the top reviewNow item when one exists", () => {
  const result = buildRecommendedNext({ reviewNow: [item({ conceptId: "x" })], reviewSoon: [], onWatch: [] }, now);
  assert.equal(result?.conceptId, "x");
});

test("falls back to reviewSoon, then onWatch, when reviewNow is empty", () => {
  const soon = buildRecommendedNext({ reviewNow: [], reviewSoon: [item({ conceptId: "s" })], onWatch: [] }, now);
  assert.equal(soon?.conceptId, "s");

  const watch = buildRecommendedNext({ reviewNow: [], reviewSoon: [], onWatch: [item({ conceptId: "w" })] }, now);
  assert.equal(watch?.conceptId, "w");
});

test("returns null when nothing needs revision -- never fabricates a recommendation", () => {
  const result = buildRecommendedNext({ reviewNow: [], reviewSoon: [], onWatch: [] }, now);
  assert.equal(result, null);
});

test("reason mentions a real common mistake when one exists", () => {
  const result = buildRecommendedNext(
    { reviewNow: [item({ commonMistakes: ["borrowing across zero"] })], reviewSoon: [], onWatch: [] },
    now,
  );
  assert.match(result!.reason, /borrowing across zero/);
});

test("reason falls back to days-since-practiced when there's no recorded common mistake", () => {
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const result = buildRecommendedNext(
    { reviewNow: [item({ commonMistakes: [], lastPracticedAt: fiveDaysAgo })], reviewSoon: [], onWatch: [] },
    now,
  );
  assert.match(result!.reason, /5 days/);
});

test("estimatedMinutes is a fixed, disclosed heuristic, not fabricated per-item precision", () => {
  const a = buildRecommendedNext({ reviewNow: [item({ conceptId: "a" })], reviewSoon: [], onWatch: [] }, now);
  const b = buildRecommendedNext({ reviewNow: [item({ conceptId: "b", masteryScore: 0.1 })], reviewSoon: [], onWatch: [] }, now);
  assert.equal(a?.estimatedMinutes, b?.estimatedMinutes);
});
