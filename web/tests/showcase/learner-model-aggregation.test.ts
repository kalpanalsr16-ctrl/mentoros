import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLearnerModel, prerequisiteState } from "@/lib/learner-model/learner-model-aggregation";
import type { OverviewChapter, OverviewConcept } from "@/lib/learning-overview/learning-overview-aggregation";

function concept(id: string, name: string, status: OverviewConcept["status"], over: Partial<OverviewConcept> = {}): OverviewConcept {
  return {
    conceptId: id,
    conceptName: name,
    status,
    masteryScore: status === "new" ? 0 : 70,
    retentionScore: null,
    retentionStatus: null,
    lastPracticedAt: null,
    commonMistakes: [],
    attempts: status === "new" ? 0 : 2,
    reasoning: "r",
    ...over,
  };
}

const chapters: OverviewChapter[] = [
  {
    chapterId: "ch",
    chapterTitle: "Give and take",
    masteredPercent: 50,
    concepts: [
      concept("add-no", "Addition without regrouping", "mastered"),
      concept("add-with", "Addition with regrouping", "learning"),
      concept("sub-with", "Subtraction with regrouping", "new"),
    ],
  },
];

test("prerequisite state maps mastery to mastered, developing, or missing", () => {
  assert.equal(prerequisiteState("mastered"), "mastered");
  assert.equal(prerequisiteState("learning"), "developing");
  assert.equal(prerequisiteState("struggling"), "developing");
  assert.equal(prerequisiteState("new"), "missing");
  assert.equal(prerequisiteState(undefined), "missing");
});

test("a concept's prerequisites come from real edges, with their current state", () => {
  const [model] = buildLearnerModel(
    chapters,
    [
      { fromId: "add-no", toId: "add-with" },
      { fromId: "add-with", toId: "sub-with" },
    ],
    [],
  );
  const subWith = model.concepts.find((c) => c.conceptId === "sub-with")!;
  assert.deepEqual(subWith.prerequisites, [{ conceptId: "add-with", conceptName: "Addition with regrouping", state: "developing" }]);
  const addWith = model.concepts.find((c) => c.conceptId === "add-with")!;
  assert.deepEqual(addWith.prerequisites, [{ conceptId: "add-no", conceptName: "Addition without regrouping", state: "mastered" }]);
});

test("edges touching unpublished concepts are ignored, never shown as learner state", () => {
  const [model] = buildLearnerModel(chapters, [{ fromId: "draft-fraction", toId: "add-with" }], []);
  assert.deepEqual(model.concepts.find((c) => c.conceptId === "add-with")!.prerequisites, []);
});

test("evidence is counted per concept with the latest assessment first", () => {
  const [model] = buildLearnerModel(
    chapters,
    [],
    [
      { conceptId: "add-with", createdAt: "2026-09-01T10:00:00Z", masteryScore: 40 },
      { conceptId: "add-with", createdAt: "2026-09-10T10:00:00Z", masteryScore: 80 },
      { conceptId: "add-no", createdAt: "2026-09-05T10:00:00Z", masteryScore: 90 },
    ],
  );
  const addWith = model.concepts.find((c) => c.conceptId === "add-with")!;
  assert.equal(addWith.evidenceCount, 2);
  assert.equal(addWith.lastAssessedAt, "2026-09-10T10:00:00Z");
  assert.equal(addWith.lastAssessedScore, 80);
});

test("a concept with no assessments shows no evidence rather than a made-up score", () => {
  const [model] = buildLearnerModel(chapters, [], []);
  const subWith = model.concepts.find((c) => c.conceptId === "sub-with")!;
  assert.equal(subWith.evidenceCount, 0);
  assert.equal(subWith.lastAssessedAt, null);
  assert.equal(subWith.lastAssessedScore, null);
});
