import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLearningOverview, type ChapterRow, type ConceptRow, type MasteryRow } from "@/lib/learning-overview/learning-overview-aggregation";

const chapters: ChapterRow[] = [{ id: "ch1", title: "Give and Take", sequence: 1 }];

test("a concept with no mastery row at all is NEW, not fabricated as struggling", () => {
  const concepts: ConceptRow[] = [{ id: "c1", name: "Addition without regrouping", chapterId: "ch1" }];
  const overview = buildLearningOverview(chapters, concepts, []);
  assert.equal(overview[0].concepts[0].status, "new");
  assert.equal(overview[0].concepts[0].masteryScore, 0);
  assert.equal(overview[0].concepts[0].retentionScore, null, "a NEW concept has nothing to decay -- no fabricated retention");
});

test("an attempted concept gets a real retentionScore/retentionStatus derived from mastery + recency", () => {
  const now = new Date("2026-02-01T00:00:00Z");
  const concepts: ConceptRow[] = [{ id: "a", name: "A", chapterId: "ch1" }];
  const mastery: MasteryRow[] = [{ conceptId: "a", masteryScore: 0.9, lastPracticedAt: now.toISOString() }];
  const overview = buildLearningOverview(chapters, concepts, mastery, now);
  assert.equal(overview[0].concepts[0].retentionScore, 90);
  assert.equal(overview[0].concepts[0].retentionStatus, "strong");
});

test("status thresholds match deriveStrength's own bands exactly", () => {
  const concepts: ConceptRow[] = [
    { id: "weak", name: "Weak", chapterId: "ch1" },
    { id: "mid", name: "Mid", chapterId: "ch1" },
    { id: "strong", name: "Strong", chapterId: "ch1" },
  ];
  const mastery: MasteryRow[] = [
    { conceptId: "weak", masteryScore: 0.2, lastPracticedAt: null },
    { conceptId: "mid", masteryScore: 0.6, lastPracticedAt: null },
    { conceptId: "strong", masteryScore: 0.9, lastPracticedAt: null },
  ];
  const overview = buildLearningOverview(chapters, concepts, mastery);
  const byId = new Map(overview[0].concepts.map((c) => [c.conceptId, c.status]));
  assert.equal(byId.get("weak"), "struggling");
  assert.equal(byId.get("mid"), "learning");
  assert.equal(byId.get("strong"), "mastered");
});

test("concepts within a chapter sort struggling, learning, new, mastered", () => {
  const concepts: ConceptRow[] = [
    { id: "a", name: "A (mastered)", chapterId: "ch1" },
    { id: "b", name: "B (new)", chapterId: "ch1" },
    { id: "c", name: "C (struggling)", chapterId: "ch1" },
    { id: "d", name: "D (learning)", chapterId: "ch1" },
  ];
  const mastery: MasteryRow[] = [
    { conceptId: "a", masteryScore: 0.9, lastPracticedAt: null },
    { conceptId: "c", masteryScore: 0.1, lastPracticedAt: null },
    { conceptId: "d", masteryScore: 0.5, lastPracticedAt: null },
  ];
  const overview = buildLearningOverview(chapters, concepts, mastery);
  assert.deepEqual(
    overview[0].concepts.map((c) => c.conceptId),
    ["c", "d", "b", "a"],
  );
});

test("masteredPercent averages only attempted concepts, excluding NEW ones", () => {
  const concepts: ConceptRow[] = [
    { id: "a", name: "A", chapterId: "ch1" },
    { id: "b", name: "B (never attempted)", chapterId: "ch1" },
  ];
  const mastery: MasteryRow[] = [{ conceptId: "a", masteryScore: 0.8, lastPracticedAt: null }];
  const overview = buildLearningOverview(chapters, concepts, mastery);
  assert.equal(overview[0].masteredPercent, 80);
});

test("a chapter with zero attempted concepts has a null masteredPercent, not zero", () => {
  const concepts: ConceptRow[] = [{ id: "a", name: "A", chapterId: "ch1" }];
  const overview = buildLearningOverview(chapters, concepts, []);
  assert.equal(overview[0].masteredPercent, null);
});

test("chapters are ordered by curriculum sequence", () => {
  const multiChapters: ChapterRow[] = [
    { id: "ch2", title: "Second", sequence: 2 },
    { id: "ch1", title: "First", sequence: 1 },
  ];
  const concepts: ConceptRow[] = [
    { id: "a", name: "A", chapterId: "ch2" },
    { id: "b", name: "B", chapterId: "ch1" },
  ];
  const overview = buildLearningOverview(multiChapters, concepts, []);
  assert.deepEqual(
    overview.map((c) => c.chapterTitle),
    ["First", "Second"],
  );
});
