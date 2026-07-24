import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveRange,
  rangeToDays,
  buildMasteryTrend,
  type MasteryEventRow,
} from "@/lib/progress-analytics/progress-analytics-aggregation";

test("resolveRange accepts a valid range", () => {
  assert.equal(resolveRange("7d"), "7d");
  assert.equal(resolveRange("90d"), "90d");
});

test("resolveRange defaults to 30d for missing/invalid input", () => {
  assert.equal(resolveRange(null), "30d");
  assert.equal(resolveRange("1y"), "30d");
  assert.equal(resolveRange(""), "30d");
});

test("rangeToDays converts the range label to a day count", () => {
  assert.equal(rangeToDays("7d"), 7);
  assert.equal(rangeToDays("30d"), 30);
  assert.equal(rangeToDays("90d"), 90);
});

test("buildMasteryTrend returns an empty list for no events", () => {
  assert.deepEqual(buildMasteryTrend([]), []);
});

test("buildMasteryTrend averages same-day events, normalizes 0-100 to 0-1, and sorts chronologically", () => {
  const rows: MasteryEventRow[] = [
    { createdAt: "2026-07-02T10:00:00Z", masteryScore: 80 },
    { createdAt: "2026-07-01T09:00:00Z", masteryScore: 40 },
    { createdAt: "2026-07-01T14:00:00Z", masteryScore: 60 },
  ];
  assert.deepEqual(buildMasteryTrend(rows), [
    { date: "2026-07-01", avgMastery: 0.5 },
    { date: "2026-07-02", avgMastery: 0.8 },
  ]);
});
