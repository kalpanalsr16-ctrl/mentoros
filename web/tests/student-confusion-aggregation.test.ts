import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateStudentConfusion, type ConfusionEventRow } from "@/lib/misconceptions/student-confusion-aggregation";

test("a misconception seen only once is excluded -- honest default threshold of 2", () => {
  const rows: ConfusionEventRow[] = [{ conceptId: null, misconceptions: ["Forgets to carry the ten"], conceptName: "Addition", createdAt: "2026-01-01" }];
  assert.deepEqual(aggregateStudentConfusion(rows), []);
});

test("the exact same wording repeated crosses the threshold and is surfaced", () => {
  const rows: ConfusionEventRow[] = [
    { conceptId: null, misconceptions: ["Forgets to carry the ten"], conceptName: "Addition with regrouping", createdAt: "2026-01-01" },
    { conceptId: null, misconceptions: ["Forgets to carry the ten"], conceptName: "Addition with regrouping", createdAt: "2026-01-05" },
  ];
  const result = aggregateStudentConfusion(rows);
  assert.equal(result.length, 1);
  assert.equal(result[0].frequency, 2);
  assert.equal(result[0].firstSeenAt, "2026-01-01");
  assert.equal(result[0].lastSeenAt, "2026-01-05");
});

test("differently-worded descriptions of the same real confusion are NOT linked -- exact match only", () => {
  const rows: ConfusionEventRow[] = [
    { conceptId: null, misconceptions: ["Forgets to carry the ten"], conceptName: "Addition", createdAt: "2026-01-01" },
    { conceptId: null, misconceptions: ["Doesn't regroup when a column exceeds 9"], conceptName: "Addition", createdAt: "2026-01-05" },
  ];
  assert.deepEqual(aggregateStudentConfusion(rows), []);
});

test("results sort by frequency, most recurring first", () => {
  const rows: ConfusionEventRow[] = [
    { conceptId: null, misconceptions: ["A"], conceptName: null, createdAt: "1" },
    { conceptId: null, misconceptions: ["A"], conceptName: null, createdAt: "2" },
    { conceptId: null, misconceptions: ["B"], conceptName: null, createdAt: "3" },
    { conceptId: null, misconceptions: ["B"], conceptName: null, createdAt: "4" },
    { conceptId: null, misconceptions: ["B"], conceptName: null, createdAt: "5" },
  ];
  const result = aggregateStudentConfusion(rows);
  assert.deepEqual(result.map((r) => r.text), ["B", "A"]);
});

test("conceptNames dedupes across repeated occurrences in the same concept", () => {
  const rows: ConfusionEventRow[] = [
    { conceptId: null, misconceptions: ["X"], conceptName: "Subtraction with regrouping", createdAt: "1" },
    { conceptId: null, misconceptions: ["X"], conceptName: "Subtraction with regrouping", createdAt: "2" },
  ];
  assert.deepEqual(aggregateStudentConfusion(rows)[0].conceptNames, ["Subtraction with regrouping"]);
});

test("conceptIds dedupes the same way, for looking up a prerequisite later", () => {
  const rows: ConfusionEventRow[] = [
    { conceptId: "subtraction-with-regrouping", misconceptions: ["X"], conceptName: "Subtraction with regrouping", createdAt: "1" },
    { conceptId: "subtraction-with-regrouping", misconceptions: ["X"], conceptName: "Subtraction with regrouping", createdAt: "2" },
  ];
  assert.deepEqual(aggregateStudentConfusion(rows)[0].conceptIds, ["subtraction-with-regrouping"]);
});
