import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLearningSnapshot } from "@/lib/learning-snapshot/learning-snapshot-aggregation";
import type { OverviewConcept } from "@/lib/learning-overview/learning-overview-aggregation";

const now = new Date("2026-02-22T00:00:00Z");

function concept(overrides: Partial<OverviewConcept>): OverviewConcept {
  return {
    conceptId: "a",
    conceptName: "A",
    status: "learning",
    masteryScore: 60,
    retentionScore: 55,
    retentionStatus: "fading",
    lastPracticedAt: null,
    commonMistakes: [],
    attempts: 1,
    reasoning: "",
    ...overrides,
  };
}

test("a brand new account (all NEW concepts) shows zero discovered, no fabricated deltas", () => {
  const snapshot = buildLearningSnapshot([concept({ status: "new", retentionScore: null })], new Map(), [], 0, now);
  assert.equal(snapshot.topicsDiscovered, 0);
  assert.equal(snapshot.discoveredThisWeek, null);
  assert.equal(snapshot.masteredPercentOfDiscovered, null);
  assert.equal(snapshot.retentionScore, null);
});

test("topicsDiscovered counts only attempted (non-NEW) concepts", () => {
  const concepts = [concept({ conceptId: "a", status: "learning" }), concept({ conceptId: "b", status: "new" })];
  const snapshot = buildLearningSnapshot(concepts, new Map(), [], 0, now);
  assert.equal(snapshot.topicsDiscovered, 1);
});

test("discoveredThisWeek counts only concepts first encountered within the last 7 days", () => {
  const concepts = [concept({ conceptId: "recent" }), concept({ conceptId: "old" })];
  const firstEncounteredAt = new Map([
    ["recent", new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()],
    ["old", new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString()],
  ]);
  const snapshot = buildLearningSnapshot(concepts, firstEncounteredAt, [], 0, now);
  assert.equal(snapshot.discoveredThisWeek, 1);
});

test("masteredPercentOfDiscovered is a real ratio, not the ratio against the full curriculum", () => {
  const concepts = [
    concept({ conceptId: "a", status: "mastered" }),
    concept({ conceptId: "b", status: "learning" }),
    concept({ conceptId: "c", status: "new" }),
  ];
  const snapshot = buildLearningSnapshot(concepts, new Map(), [], 0, now);
  assert.equal(snapshot.topicsDiscovered, 2);
  assert.equal(snapshot.topicsMastered, 1);
  assert.equal(snapshot.masteredPercentOfDiscovered, 50);
});

test("retentionScore is null when nothing has been attempted, never a fabricated 0", () => {
  const snapshot = buildLearningSnapshot([concept({ status: "new", retentionScore: null })], new Map(), [], 0, now);
  assert.equal(snapshot.retentionScore, null);
});

test("retentionDeltaThisWeek is omitted (null) when there's fewer than 2 weekly buckets to compare", () => {
  const snapshot = buildLearningSnapshot([concept({})], new Map(), [{ weekStart: now.toISOString(), averageScore: 80 }], 0, now);
  assert.equal(snapshot.retentionDeltaThisWeek, null);
});

test("retentionDeltaThisWeek compares the two most recent real weekly buckets", () => {
  const trend = [
    { weekStart: "2026-02-01", averageScore: 70 },
    { weekStart: "2026-02-08", averageScore: 76 },
  ];
  const snapshot = buildLearningSnapshot([concept({})], new Map(), trend, 0, now);
  assert.equal(snapshot.retentionDeltaThisWeek, 6);
});

test("needsRevision is exactly the reviewNowCount passed in -- not an independently derived number", () => {
  const snapshot = buildLearningSnapshot([concept({})], new Map(), [], 3, now);
  assert.equal(snapshot.needsRevision, 3);
});

test("needsRevision is 0 when the revision queue's reviewNow tier is empty, even with other concepts present", () => {
  const concepts = [concept({ conceptId: "a", status: "mastered" }), concept({ conceptId: "b", status: "learning" })];
  const snapshot = buildLearningSnapshot(concepts, new Map(), [], 0, now);
  assert.equal(snapshot.needsRevision, 0);
});
