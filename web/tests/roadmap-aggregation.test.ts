import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRoadmap, type ChapterRow, type ConceptRow, type PrerequisiteEdge, type MasteryRow } from "@/lib/roadmap/roadmap-aggregation";

const CHAPTERS: ChapterRow[] = [{ id: "give-and-take", title: "Give and Take", sequence: 1 }];

const CONCEPTS: ConceptRow[] = [
  { id: "addition-without-regrouping", name: "Addition without regrouping", chapterId: "give-and-take" },
  { id: "addition-with-regrouping", name: "Addition with regrouping", chapterId: "give-and-take" },
  { id: "subtraction-without-regrouping", name: "Subtraction without regrouping", chapterId: "give-and-take" },
  { id: "subtraction-with-regrouping", name: "Subtraction with regrouping", chapterId: "give-and-take" },
];

const EDGES: PrerequisiteEdge[] = [
  { fromConceptId: "addition-without-regrouping", toConceptId: "addition-with-regrouping" },
  { fromConceptId: "subtraction-without-regrouping", toConceptId: "subtraction-with-regrouping" },
  { fromConceptId: "addition-without-regrouping", toConceptId: "subtraction-without-regrouping" },
];

test("buildRoadmap orders concepts within a chapter by prerequisite_of edges", () => {
  const result = buildRoadmap(CHAPTERS, CONCEPTS, EDGES, []);
  assert.equal(result.degraded, false);
  if (result.degraded) return;

  const order = result.chapters[0].nodes.map((n) => n.conceptId);
  // addition-without-regrouping has no prerequisite, so it must come first;
  // each edge's "to" must appear after its "from".
  assert.equal(order[0], "addition-without-regrouping");
  assert.ok(order.indexOf("addition-with-regrouping") > order.indexOf("addition-without-regrouping"));
  assert.ok(order.indexOf("subtraction-with-regrouping") > order.indexOf("subtraction-without-regrouping"));
  assert.ok(order.indexOf("subtraction-without-regrouping") > order.indexOf("addition-without-regrouping"));
});

test("buildRoadmap marks the first non-mastered concept as current, everything before as done, everything after as next", () => {
  const mastery: MasteryRow[] = [
    { conceptId: "addition-without-regrouping", masteryScore: 0.9 },
    { conceptId: "addition-with-regrouping", masteryScore: 0.85 },
    { conceptId: "subtraction-without-regrouping", masteryScore: 0.3 },
  ];
  const result = buildRoadmap(CHAPTERS, CONCEPTS, EDGES, mastery);
  assert.equal(result.degraded, false);
  if (result.degraded) return;

  const byId = new Map(result.chapters[0].nodes.map((n) => [n.conceptId, n]));
  assert.equal(byId.get("addition-without-regrouping")!.status, "done");
  assert.equal(byId.get("addition-with-regrouping")!.status, "done");
  assert.equal(byId.get("subtraction-without-regrouping")!.status, "current");
  // subtraction-with-regrouping comes after the current node in sequence.
  assert.equal(byId.get("subtraction-with-regrouping")!.status, "next");
});

test("buildRoadmap treats a concept with no mastery row at all as not-yet-mastered", () => {
  const result = buildRoadmap(CHAPTERS, CONCEPTS, EDGES, []);
  assert.equal(result.degraded, false);
  if (result.degraded) return;
  assert.equal(result.chapters[0].nodes[0].status, "current");
});

test("buildRoadmap marks every concept done (no current) once all are mastered", () => {
  const mastery: MasteryRow[] = CONCEPTS.map((c) => ({ conceptId: c.id, masteryScore: 0.95 }));
  const result = buildRoadmap(CHAPTERS, CONCEPTS, EDGES, mastery);
  assert.equal(result.degraded, false);
  if (result.degraded) return;
  assert.ok(result.chapters[0].nodes.every((n) => n.status === "done"));
});

test("buildRoadmap orders chapters by their own sequence column, not array order", () => {
  const chapters: ChapterRow[] = [
    { id: "ch2", title: "Second", sequence: 2 },
    { id: "ch1", title: "First", sequence: 1 },
  ];
  const concepts: ConceptRow[] = [
    { id: "c-in-ch2", name: "C in ch2", chapterId: "ch2" },
    { id: "c-in-ch1", name: "C in ch1", chapterId: "ch1" },
  ];
  const result = buildRoadmap(chapters, concepts, [], []);
  assert.equal(result.degraded, false);
  if (result.degraded) return;
  assert.deepEqual(result.chapters.map((c) => c.chapterId), ["ch1", "ch2"]);
});

test("buildRoadmap degrades to a flat concept-name list on a prerequisite cycle", () => {
  const cyclicEdges: PrerequisiteEdge[] = [
    { fromConceptId: "addition-without-regrouping", toConceptId: "addition-with-regrouping" },
    { fromConceptId: "addition-with-regrouping", toConceptId: "addition-without-regrouping" },
  ];
  const result = buildRoadmap(CHAPTERS, CONCEPTS, cyclicEdges, []);
  assert.equal(result.degraded, true);
  if (!result.degraded) return;
  assert.deepEqual(result.conceptNames.sort(), CONCEPTS.map((c) => c.name).sort());
});

test("buildRoadmap converts mastery_score's 0-1 scale to a 0-100 display value", () => {
  const result = buildRoadmap(CHAPTERS, CONCEPTS, EDGES, [
    { conceptId: "addition-without-regrouping", masteryScore: 0.85 },
  ]);
  assert.equal(result.degraded, false);
  if (result.degraded) return;
  const node = result.chapters[0].nodes.find((n) => n.conceptId === "addition-without-regrouping")!;
  assert.equal(node.masteryScore, 85);
});
