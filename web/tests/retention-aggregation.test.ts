import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveRetention,
  classifyRetention,
  buildRetentionTrend,
  RETENTION_STRONG_THRESHOLD,
  RETENTION_FADING_THRESHOLD,
} from "@/lib/retention/retention-aggregation";

test("a concept practiced today keeps its full mastery score as retention", () => {
  const now = new Date("2026-02-01T00:00:00Z");
  const retention = deriveRetention(0.9, now.toISOString(), now);
  assert.equal(retention, 0.9);
});

test("retention decays with time since last practiced but never claims total forgetting", () => {
  const now = new Date("2026-02-01T00:00:00Z");
  const longAgo = new Date("2025-06-01T00:00:00Z").toISOString();
  const retention = deriveRetention(0.9, longAgo, now);
  assert.ok(retention >= 0.9 * 0.5, "retention should floor at 50% of mastery, never lower");
  assert.ok(retention < 0.9, "retention should be discounted below raw mastery for a stale concept");
});

test("a concept never practiced (no last_practiced_at) is not decayed -- nothing to decay from", () => {
  const retention = deriveRetention(0.7, null);
  assert.equal(retention, 0.7);
});

test("classifyRetention respects the documented thresholds", () => {
  assert.equal(classifyRetention(RETENTION_STRONG_THRESHOLD), "strong");
  assert.equal(classifyRetention(RETENTION_STRONG_THRESHOLD - 0.01), "fading");
  assert.equal(classifyRetention(RETENTION_FADING_THRESHOLD), "fading");
  assert.equal(classifyRetention(RETENTION_FADING_THRESHOLD - 0.01), "review");
});

test("buildRetentionTrend only returns weeks that actually have data", () => {
  const now = new Date("2026-02-22T00:00:00Z");
  const events = [{ conceptId: "a", masteryScore: 80, createdAt: "2026-02-20T00:00:00Z" }];
  const trend = buildRetentionTrend(events, now, 3);
  assert.equal(trend.length, 1, "only the one week with data should appear, not 3 fabricated points");
  assert.equal(trend[0].averageScore, 80);
});

test("buildRetentionTrend with no events returns no buckets at all", () => {
  const now = new Date("2026-02-22T00:00:00Z");
  assert.deepEqual(buildRetentionTrend([], now, 3), []);
});

test("buildRetentionTrend averages multiple events within the same week and orders oldest-first", () => {
  const now = new Date("2026-02-22T00:00:00Z");
  const events = [
    { conceptId: "a", masteryScore: 60, createdAt: "2026-02-01T00:00:00Z" }, // 3 weeks ago bucket
    { conceptId: "a", masteryScore: 90, createdAt: "2026-02-20T00:00:00Z" }, // this week
    { conceptId: "a", masteryScore: 70, createdAt: "2026-02-21T00:00:00Z" }, // this week
  ];
  const trend = buildRetentionTrend(events, now, 3);
  assert.equal(trend.length, 2);
  assert.equal(trend[0].averageScore, 60);
  assert.equal(trend[1].averageScore, 80);
  assert.ok(new Date(trend[0].weekStart).getTime() < new Date(trend[1].weekStart).getTime());
});
