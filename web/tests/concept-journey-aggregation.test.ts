import { test } from "node:test";
import assert from "node:assert/strict";
import { buildConceptJourney, buildConceptReasoning, mapPracticeEvents } from "@/lib/learning-journey/concept-journey-aggregation";

test("mapPracticeEvents extracts difficulty and questionCount, defaulting missing fields to null", () => {
  const rows = [{ id: "1", created_at: "2026-01-01", payload: { difficulty: "Beginner", questionCount: 5 } }];
  const items = mapPracticeEvents(rows);
  assert.equal(items[0].difficulty, "Beginner");
  assert.equal(items[0].questionCount, 5);
});

test("mapPracticeEvents defaults missing difficulty/questionCount to null, not fabricated values", () => {
  const rows = [{ id: "1", created_at: "2026-01-01", payload: {} }];
  const items = mapPracticeEvents(rows);
  assert.equal(items[0].difficulty, null);
  assert.equal(items[0].questionCount, null);
});

test("buildConceptJourney sorts both practice and assessment items newest first", () => {
  const practiceRows = [
    { id: "old", created_at: "2026-01-01", payload: {} },
    { id: "new", created_at: "2026-02-01", payload: {} },
  ];
  const assessmentRows = [
    { id: "old-a", created_at: "2026-01-01", payload: {} },
    { id: "new-a", created_at: "2026-02-01", payload: {} },
  ];
  const journey = buildConceptJourney(practiceRows, assessmentRows);
  assert.deepEqual(journey.practiceItems.map((i) => i.id), ["new", "old"]);
  assert.deepEqual(journey.assessmentItems.map((i) => i.id), ["new-a", "old-a"]);
});

test("buildConceptReasoning for a never-attempted concept says so honestly, with no fabricated numbers", () => {
  const reasoning = buildConceptReasoning(0, 0, null, []);
  assert.match(reasoning, /haven't attempted/);
});

test("buildConceptReasoning cites only real fields -- attempts, recency, mastery, and a real mistake if any", () => {
  const now = new Date("2026-02-22T00:00:00Z");
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const reasoning = buildConceptReasoning(3, 48, fiveDaysAgo, ["borrowing across zero"], now);
  assert.match(reasoning, /3 attempts/);
  assert.match(reasoning, /5 days ago/);
  assert.match(reasoning, /48%/);
  assert.match(reasoning, /borrowing across zero/);
  assert.doesNotMatch(reasoning, /hint/i, "must never claim hint data that doesn't exist anywhere in this schema");
});
