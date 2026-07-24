import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveSuggestedAction,
  formatSuggestedAction,
  buildMisconceptionList,
  buildStudentOverview,
} from "@/lib/teacher-roster/student-overview-aggregation";
import type { ConceptMasteryRow } from "@/lib/progress/progress-aggregation";

function row(overrides: Partial<ConceptMasteryRow>): ConceptMasteryRow {
  return {
    conceptId: "c1",
    conceptName: "Addition",
    chapterId: "ch1",
    chapterTitle: "Addition & Subtraction",
    chapterSequence: 1,
    masteryScore: 0.5,
    strength: null,
    ...overrides,
  };
}

test("deriveSuggestedAction returns 'start' with no mastery rows", () => {
  assert.deepEqual(deriveSuggestedAction([]), { type: "start" });
});

test("deriveSuggestedAction returns 'revise' with the single weakest concept's id and name when at-risk", () => {
  const rows = [row({ conceptId: "weak", conceptName: "Subtraction", masteryScore: 0.1 }), row({ conceptId: "weaker", conceptName: "Carrying", masteryScore: 0.05 })];
  assert.deepEqual(deriveSuggestedAction(rows), { type: "revise", conceptId: "weaker", conceptName: "Carrying" });
});

test("deriveSuggestedAction returns 'none' when mastery is solid", () => {
  const rows = [row({ masteryScore: 0.9 }), row({ conceptId: "c2", masteryScore: 0.85 })];
  assert.deepEqual(deriveSuggestedAction(rows), { type: "none" });
});

test("formatSuggestedAction produces the right sentence per action type", () => {
  assert.equal(formatSuggestedAction({ type: "start" }, "Jamie"), "Encourage Jamie to start practicing.");
  assert.equal(formatSuggestedAction({ type: "revise", conceptId: "c1", conceptName: "Carrying" }, "Jamie"), "Suggest revision on Carrying.");
  assert.equal(formatSuggestedAction({ type: "none" }, "Jamie"), null);
});

test("buildMisconceptionList dedupes across both sources, preserving first-seen order", () => {
  const result = buildMisconceptionList(
    [["Forgets to carry"], ["Forgets to carry", "Misreads place value"]],
    [["Misreads place value"], ["Confuses addition and subtraction"]],
  );
  assert.deepEqual(result, ["Forgets to carry", "Misreads place value", "Confuses addition and subtraction"]);
});

test("buildStudentOverview composes chapters/atRisk/suggestedAction/misconceptions together", () => {
  const rows = [row({ masteryScore: 0.1 })];
  const overview = buildStudentOverview(rows, [["Forgets to carry"]], []);
  assert.equal(overview.atRisk, true);
  assert.deepEqual(overview.suggestedAction, { type: "revise", conceptId: "c1", conceptName: "Addition" });
  assert.deepEqual(overview.misconceptions, ["Forgets to carry"]);
  assert.equal(overview.chapters.length, 1);
});
