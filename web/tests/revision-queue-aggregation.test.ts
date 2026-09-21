import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRevisionQueue, type WeakConceptRow } from "@/lib/revision/revision-queue-aggregation";

test("only concepts below the weak threshold are queued", () => {
  const rows: WeakConceptRow[] = [
    { conceptId: "a", conceptName: "A", masteryScore: 0.2, lastPracticedAt: null },
    { conceptId: "b", conceptName: "B", masteryScore: 0.6, lastPracticedAt: null },
    { conceptId: "c", conceptName: "C", masteryScore: 0.9, lastPracticedAt: null },
  ];
  const queue = buildRevisionQueue(rows);
  assert.deepEqual(
    queue.dueNow.map((r) => r.conceptId),
    ["a"],
  );
});

test("sorted lowest mastery first", () => {
  const rows: WeakConceptRow[] = [
    { conceptId: "a", conceptName: "A", masteryScore: 0.3, lastPracticedAt: null },
    { conceptId: "b", conceptName: "B", masteryScore: 0.1, lastPracticedAt: null },
  ];
  const queue = buildRevisionQueue(rows);
  assert.deepEqual(
    queue.dueNow.map((r) => r.conceptId),
    ["b", "a"],
  );
});

test("equal mastery breaks ties by oldest last_practiced_at, never-practiced first", () => {
  const rows: WeakConceptRow[] = [
    { conceptId: "recent", conceptName: "Recent", masteryScore: 0.2, lastPracticedAt: "2026-01-10" },
    { conceptId: "never", conceptName: "Never", masteryScore: 0.2, lastPracticedAt: null },
    { conceptId: "old", conceptName: "Old", masteryScore: 0.2, lastPracticedAt: "2026-01-01" },
  ];
  const queue = buildRevisionQueue(rows);
  assert.deepEqual(
    queue.dueNow.map((r) => r.conceptId),
    ["never", "old", "recent"],
  );
});

test("upcoming is always empty -- no fake future scheduling", () => {
  const rows: WeakConceptRow[] = [{ conceptId: "a", conceptName: "A", masteryScore: 0.1, lastPracticedAt: null }];
  assert.deepEqual(buildRevisionQueue(rows).upcoming, []);
});

test("no weak concepts produces an empty, honest queue", () => {
  const rows: WeakConceptRow[] = [{ conceptId: "a", conceptName: "A", masteryScore: 0.9, lastPracticedAt: null }];
  assert.deepEqual(buildRevisionQueue(rows), { dueNow: [], upcoming: [] });
});
