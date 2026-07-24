import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateMisconceptions, type MisconceptionEventRow } from "@/lib/misconceptions/misconception-report-aggregation";

test("aggregateMisconceptions returns an empty list for no events", () => {
  assert.deepEqual(aggregateMisconceptions([]), []);
});

test("aggregateMisconceptions counts frequency and dedupes affected students, sorted most-frequent-first", () => {
  const rows: MisconceptionEventRow[] = [
    { studentName: "Jamie", misconceptions: ["Forgets to carry", "Misreads place value"] },
    { studentName: "Alex", misconceptions: ["Forgets to carry"] },
    { studentName: "Jamie", misconceptions: ["Forgets to carry"] },
  ];
  const result = aggregateMisconceptions(rows);
  assert.deepEqual(result, [
    { text: "Forgets to carry", frequency: 3, affectedStudents: ["Jamie", "Alex"] },
    { text: "Misreads place value", frequency: 1, affectedStudents: ["Jamie"] },
  ]);
});

test("aggregateMisconceptions ignores empty misconception strings", () => {
  const rows: MisconceptionEventRow[] = [{ studentName: "Jamie", misconceptions: ["", "Real one"] }];
  assert.deepEqual(aggregateMisconceptions(rows), [{ text: "Real one", frequency: 1, affectedStudents: ["Jamie"] }]);
});
