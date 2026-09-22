import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRevisionQueue, type WeakConceptRow } from "@/lib/revision/revision-queue-aggregation";

const now = new Date("2026-02-22T00:00:00Z");

function row(overrides: Partial<WeakConceptRow>): WeakConceptRow {
  return {
    conceptId: "a",
    conceptName: "A",
    masteryScore: 0.9,
    lastPracticedAt: now.toISOString(),
    commonMistakes: [],
    ...overrides,
  };
}

test("a struggling concept (weak mastery) lands in reviewNow with an honest reason", () => {
  const queue = buildRevisionQueue([row({ conceptId: "weak", masteryScore: 0.2 })], now);
  assert.deepEqual(queue.reviewNow.map((r) => r.conceptId), ["weak"]);
  assert.equal(queue.reviewNow[0].reason, "Struggling with related questions");
});

test("a decent-mastery concept whose retention has decayed below the review threshold also lands in reviewNow", () => {
  const staleDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const queue = buildRevisionQueue([row({ conceptId: "decayed", masteryScore: 0.55, lastPracticedAt: staleDate })], now);
  assert.deepEqual(queue.reviewNow.map((r) => r.conceptId), ["decayed"]);
  assert.equal(queue.reviewNow[0].reason, "Retention declining");
});

test("a fading concept in the lower half of the fading band lands in reviewSoon", () => {
  const staleDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();
  const queue = buildRevisionQueue([row({ conceptId: "fading", masteryScore: 0.85, lastPracticedAt: staleDate })], now);
  assert.deepEqual(queue.reviewSoon.map((r) => r.conceptId), ["fading"]);
});

test("a fading concept in the upper half of the fading band lands in onWatch as a lighter nudge", () => {
  const staleDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const queue = buildRevisionQueue([row({ conceptId: "stale", masteryScore: 0.95, lastPracticedAt: staleDate })], now);
  assert.deepEqual(queue.onWatch.map((r) => r.conceptId), ["stale"]);
  assert.equal(queue.onWatch[0].reason, "Scheduled reinforcement");
});

test("a strong, recently-practiced concept needs nothing and is excluded entirely", () => {
  const queue = buildRevisionQueue([row({ conceptId: "fine", masteryScore: 0.95, lastPracticedAt: now.toISOString() })], now);
  assert.deepEqual(queue.reviewNow, []);
  assert.deepEqual(queue.reviewSoon, []);
  assert.deepEqual(queue.onWatch, []);
});

test("within a tier, items sort lowest retention first", () => {
  const queue = buildRevisionQueue(
    [row({ conceptId: "a", masteryScore: 0.3 }), row({ conceptId: "b", masteryScore: 0.1 })],
    now,
  );
  assert.deepEqual(
    queue.reviewNow.map((r) => r.conceptId),
    ["b", "a"],
  );
});

test("no rows produces an empty, honest queue on all three tiers", () => {
  assert.deepEqual(buildRevisionQueue([], now), { reviewNow: [], reviewSoon: [], onWatch: [] });
});
