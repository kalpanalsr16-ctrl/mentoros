import { test } from "node:test";
import assert from "node:assert/strict";
import { mapPracticeEvents, type PracticeEventRow } from "@/lib/practice-history/practice-history-aggregation";

function row(overrides: Partial<PracticeEventRow>): PracticeEventRow {
  return {
    id: "evt-1",
    created_at: "2026-07-01T00:00:00.000Z",
    payload: { conceptName: "Addition", difficulty: "Medium", questionCount: 5 },
    ...overrides,
  };
}

test("mapPracticeEvents reads conceptName/difficulty/questionCount straight from payload", () => {
  const [item] = mapPracticeEvents([row({})]);
  assert.equal(item.conceptName, "Addition");
  assert.equal(item.difficulty, "Medium");
  assert.equal(item.questionCount, 5);
  assert.equal(item.createdAt, "2026-07-01T00:00:00.000Z");
});

test("mapPracticeEvents falls back safely when a pre-Sprint-F5 row has no conceptName", () => {
  const [item] = mapPracticeEvents([
    row({ payload: { difficulty: "Easy", questionCount: 3 } }),
  ]);
  assert.equal(item.conceptName, "This concept");
});

test("mapPracticeEvents falls back to Medium for an invalid/missing difficulty value", () => {
  const [item] = mapPracticeEvents([row({ payload: { conceptName: "Addition", difficulty: "Nonsense" } })]);
  assert.equal(item.difficulty, "Medium");
});

test("mapPracticeEvents preserves row order (query already sorts reverse-chronological)", () => {
  const rows = [
    row({ id: "evt-newer", created_at: "2026-07-05T00:00:00.000Z" }),
    row({ id: "evt-older", created_at: "2026-07-01T00:00:00.000Z" }),
  ];
  const items = mapPracticeEvents(rows);
  assert.deepEqual(items.map((i) => i.id), ["evt-newer", "evt-older"]);
});
