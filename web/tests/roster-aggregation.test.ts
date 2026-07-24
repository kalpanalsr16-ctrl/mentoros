import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeAtRisk,
  summarizeStudent,
  computeStrugglingConcepts,
  buildClassOverview,
  type MasteryRow,
} from "@/lib/teacher-roster/roster-aggregation";

test("computeAtRisk is false for a student with no rows yet", () => {
  assert.equal(computeAtRisk([]), false);
});

test("computeAtRisk is true when average mastery is below the low threshold", () => {
  assert.equal(computeAtRisk([{ masteryScore: 0.2 }, { masteryScore: 0.3 }]), true);
});

test("computeAtRisk is true with 2+ individually weak concepts even if the average is fine", () => {
  assert.equal(computeAtRisk([{ masteryScore: 0.3 }, { masteryScore: 0.3 }, { masteryScore: 0.9 }]), true);
});

test("computeAtRisk is false for solid, consistent mastery", () => {
  assert.equal(computeAtRisk([{ masteryScore: 0.85 }, { masteryScore: 0.9 }]), false);
});

test("summarizeStudent returns not-started (null avgMastery, not at-risk) with zero rows", () => {
  const summary = summarizeStudent("s1", "Jamie", []);
  assert.deepEqual(summary, { studentId: "s1", studentName: "Jamie", avgMastery: null, conceptsAttempted: 0, atRisk: false });
});

test("summarizeStudent averages only that student's own rows", () => {
  const rows: MasteryRow[] = [
    { studentId: "s1", conceptId: "c1", conceptName: "Addition", masteryScore: 0.9 },
    { studentId: "s2", conceptId: "c1", conceptName: "Addition", masteryScore: 0.1 },
  ];
  const summary = summarizeStudent("s1", "Jamie", rows);
  assert.equal(summary.avgMastery, 0.9);
  assert.equal(summary.conceptsAttempted, 1);
  assert.equal(summary.atRisk, false);
});

test("computeStrugglingConcepts averages per concept across the roster, drops concepts at/above the high threshold, sorts weakest first, caps at 5", () => {
  const rows: MasteryRow[] = [
    { studentId: "s1", conceptId: "weak", conceptName: "Weak Concept", masteryScore: 0.2 },
    { studentId: "s2", conceptId: "weak", conceptName: "Weak Concept", masteryScore: 0.4 },
    { studentId: "s1", conceptId: "mastered", conceptName: "Mastered Concept", masteryScore: 0.95 },
    ...Array.from({ length: 6 }, (_, i) => ({
      studentId: "s1",
      conceptId: `mid-${i}`,
      conceptName: `Mid Concept ${i}`,
      masteryScore: 0.5 + i * 0.01,
    })),
  ];
  const result = computeStrugglingConcepts(rows);
  assert.equal(result.length, 5);
  assert.equal(result[0].conceptId, "weak");
  assert.ok(Math.abs(result[0].avgMastery - 0.3) < 1e-9);
  assert.equal(result[0].studentCount, 2);
  assert.ok(!result.some((c) => c.conceptId === "mastered"));
});

test("buildClassOverview sorts at-risk first, then not-started, then everyone else weakest-first, and computes classAvgMastery over started students only", () => {
  const roster = [
    { studentId: "strong", studentName: "Strong Student" },
    { studentId: "at-risk", studentName: "At Risk Student" },
    { studentId: "fresh", studentName: "Fresh Student" },
  ];
  const rows: MasteryRow[] = [
    { studentId: "strong", conceptId: "c1", conceptName: "Addition", masteryScore: 0.9 },
    { studentId: "at-risk", conceptId: "c1", conceptName: "Addition", masteryScore: 0.2 },
  ];
  const overview = buildClassOverview(roster, rows);
  assert.deepEqual(
    overview.students.map((s) => s.studentId),
    ["at-risk", "fresh", "strong"],
  );
  assert.equal(overview.atRiskCount, 1);
  assert.equal(overview.classAvgMastery, 0.55);
});
