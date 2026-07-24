import { test } from "node:test";
import assert from "node:assert/strict";
import {
  groupStudentsByMisconceptionConcept,
  buildInterventions,
  type ConceptMisconceptionEventRow,
} from "@/lib/interventions/intervention-aggregation";
import type { MasteryRow } from "@/lib/teacher-roster/roster-aggregation";

test("groupStudentsByMisconceptionConcept ignores zero-misconception rows and groups the rest by concept", () => {
  const rows: ConceptMisconceptionEventRow[] = [
    { studentId: "s1", conceptId: "c1", misconceptionCount: 1 },
    { studentId: "s2", conceptId: "c1", misconceptionCount: 2 },
    { studentId: "s3", conceptId: "c2", misconceptionCount: 0 },
  ];
  const result = groupStudentsByMisconceptionConcept(rows);
  assert.deepEqual([...(result.get("c1") ?? [])].sort(), ["s1", "s2"]);
  assert.equal(result.has("c2"), false);
});

test("buildInterventions excludes students whose suggested action is 'none'", () => {
  const roster = [{ studentId: "s1", studentName: "Alex" }];
  const masteryRows: MasteryRow[] = [{ studentId: "s1", conceptId: "c1", conceptName: "Addition", masteryScore: 0.9 }];
  assert.deepEqual(buildInterventions(roster, masteryRows, []), []);
});

test("buildInterventions gives priority 2 to a not-started student", () => {
  const roster = [{ studentId: "s1", studentName: "Alex" }];
  const result = buildInterventions(roster, [], []);
  assert.equal(result.length, 1);
  assert.equal(result[0].priority, 2);
  assert.equal(result[0].reason, "Hasn't started practicing yet.");
  assert.equal(result[0].conceptId, null);
});

test("buildInterventions gives priority 1 to an at-risk student with no shared misconception", () => {
  const roster = [{ studentId: "s1", studentName: "Alex" }];
  const masteryRows: MasteryRow[] = [{ studentId: "s1", conceptId: "c1", conceptName: "Addition", masteryScore: 0.1 }];
  const result = buildInterventions(roster, masteryRows, []);
  assert.equal(result[0].priority, 1);
  assert.equal(result[0].conceptId, "c1");
  assert.equal(result[0].reason, "At risk on Addition.");
});

test("buildInterventions gives priority 0 when the weakest concept is a class-wide shared misconception", () => {
  const roster = [
    { studentId: "s1", studentName: "Alex" },
    { studentId: "s2", studentName: "Bailey" },
  ];
  const masteryRows: MasteryRow[] = [
    { studentId: "s1", conceptId: "c1", conceptName: "Addition", masteryScore: 0.1 },
    { studentId: "s2", conceptId: "c1", conceptName: "Addition", masteryScore: 0.9 },
  ];
  const misconceptionRows: ConceptMisconceptionEventRow[] = [
    { studentId: "s1", conceptId: "c1", misconceptionCount: 1 },
    { studentId: "s2", conceptId: "c1", misconceptionCount: 1 },
  ];
  const result = buildInterventions(roster, masteryRows, misconceptionRows);
  assert.equal(result.length, 1); // Bailey isn't at risk, so only Alex is suggested
  assert.equal(result[0].studentId, "s1");
  assert.equal(result[0].priority, 0);
  assert.equal(result[0].reason, "At risk on Addition -- shared with 1 other student.");
});

test("buildInterventions sorts by priority ascending, then by student name", () => {
  const roster = [
    { studentId: "s1", studentName: "Zed" },
    { studentId: "s2", studentName: "Alex" },
  ];
  // Both not-started (priority 2) -- should sort alphabetically within the tie.
  const result = buildInterventions(roster, [], []);
  assert.deepEqual(result.map((r) => r.studentName), ["Alex", "Zed"]);
});
