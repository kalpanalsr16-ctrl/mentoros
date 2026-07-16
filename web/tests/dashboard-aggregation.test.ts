import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStreak, pickRevisionSuggestion, pickRecentConcepts, type MasteryRow } from "@/lib/dashboard/dashboard-aggregation";

function daysAgo(n: number, from = new Date("2026-07-17T12:00:00Z")): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

test("computeStreak counts consecutive active days ending today", () => {
  const today = new Date("2026-07-17T09:00:00Z");
  const activeDates = [daysAgo(0, today), daysAgo(1, today), daysAgo(2, today)];
  assert.equal(computeStreak(activeDates, today), 3);
});

test("computeStreak still counts a streak with no activity yet today, if yesterday was active", () => {
  const today = new Date("2026-07-17T06:00:00Z");
  const activeDates = [daysAgo(1, today), daysAgo(2, today)];
  assert.equal(computeStreak(activeDates, today), 2);
});

test("computeStreak resets to 0 once a day is missed entirely", () => {
  const today = new Date("2026-07-17T09:00:00Z");
  const activeDates = [daysAgo(2, today), daysAgo(3, today)]; // gap at day 0 and day 1
  assert.equal(computeStreak(activeDates, today), 0);
});

test("computeStreak is 0 with no messages at all", () => {
  assert.equal(computeStreak([], new Date("2026-07-17T09:00:00Z")), 0);
});

test("computeStreak counts multiple same-day messages as a single active day", () => {
  const today = new Date("2026-07-17T09:00:00Z");
  const activeDates = [today, new Date("2026-07-17T20:00:00Z"), daysAgo(1, today)];
  assert.equal(computeStreak(activeDates, today), 2);
});

const rows: MasteryRow[] = [
  { conceptId: "c1", conceptName: "Addition", masteryScore: 0.9, lastPracticedAt: "2026-07-10T00:00:00Z" },
  { conceptId: "c2", conceptName: "Subtraction", masteryScore: 0.3, lastPracticedAt: "2026-07-15T00:00:00Z" },
  { conceptId: "c3", conceptName: "Fractions", masteryScore: 0.5, lastPracticedAt: "2026-07-05T00:00:00Z" },
];

test("pickRevisionSuggestion picks the lowest-mastery concept below the weak threshold", () => {
  const suggestion = pickRevisionSuggestion(rows);
  assert.equal(suggestion?.conceptId, "c2");
});

test("pickRevisionSuggestion is null when nothing is below the weak threshold", () => {
  const strongRows: MasteryRow[] = rows.map((r) => ({ ...r, masteryScore: 0.8 }));
  assert.equal(pickRevisionSuggestion(strongRows), null);
});

test("pickRecentConcepts orders by last_practiced_at descending, capped at the limit", () => {
  const recent = pickRecentConcepts(rows, 2);
  assert.deepEqual(recent.map((r) => r.conceptId), ["c2", "c1"]);
});

test("pickRecentConcepts excludes concepts never practiced", () => {
  const withUnpracticed: MasteryRow[] = [...rows, { conceptId: "c4", conceptName: "Multiplication", masteryScore: 0, lastPracticedAt: null }];
  const recent = pickRecentConcepts(withUnpracticed, 10);
  assert.ok(!recent.some((r) => r.conceptId === "c4"));
});
