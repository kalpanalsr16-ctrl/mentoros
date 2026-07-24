import { test } from "node:test";
import assert from "node:assert/strict";
import { groupRevisionItems, type RevisionRow } from "@/lib/revision/revision-aggregation";

const NOW = new Date("2026-07-15T12:00:00Z");

function row(overrides: Partial<RevisionRow>): RevisionRow {
  return {
    id: "r1",
    conceptId: "c1",
    conceptName: "Concept",
    dueAt: "2026-07-15T12:00:00Z",
    ...overrides,
  };
}

test("groupRevisionItems buckets a past-or-equal due date as due now", () => {
  const rows = [row({ id: "past", dueAt: "2026-07-10T00:00:00Z" }), row({ id: "exact", dueAt: NOW.toISOString() })];
  const { dueNow, upcoming } = groupRevisionItems(rows, NOW);
  assert.deepEqual(dueNow.map((r) => r.id).sort(), ["exact", "past"]);
  assert.equal(upcoming.length, 0);
});

test("groupRevisionItems buckets a future due date as upcoming", () => {
  const rows = [row({ id: "future", dueAt: "2026-07-20T00:00:00Z" })];
  const { dueNow, upcoming } = groupRevisionItems(rows, NOW);
  assert.equal(dueNow.length, 0);
  assert.deepEqual(upcoming.map((r) => r.id), ["future"]);
});

test("groupRevisionItems sorts each bucket soonest-first", () => {
  const rows = [
    row({ id: "later", dueAt: "2026-07-25T00:00:00Z" }),
    row({ id: "sooner", dueAt: "2026-07-18T00:00:00Z" }),
  ];
  const { upcoming } = groupRevisionItems(rows, NOW);
  assert.deepEqual(upcoming.map((r) => r.id), ["sooner", "later"]);
});

test("groupRevisionItems returns empty groups for no rows", () => {
  const result = groupRevisionItems([], NOW);
  assert.deepEqual(result, { dueNow: [], upcoming: [] });
});
