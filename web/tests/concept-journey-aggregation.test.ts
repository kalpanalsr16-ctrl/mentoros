import { test } from "node:test";
import assert from "node:assert/strict";
import { buildConceptJourney, mapPracticeEvents } from "@/lib/learning-journey/concept-journey-aggregation";

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
