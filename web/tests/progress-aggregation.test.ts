import { test } from "node:test";
import assert from "node:assert/strict";
import { groupByChapter, deriveStrength, type ConceptMasteryRow } from "@/lib/progress/progress-aggregation";

function row(overrides: Partial<ConceptMasteryRow>): ConceptMasteryRow {
  return {
    conceptId: "c1",
    conceptName: "Concept",
    chapterId: "ch1",
    chapterTitle: "Chapter 1",
    chapterSequence: 1,
    masteryScore: 0.5,
    strength: null,
    ...overrides,
  };
}

test("deriveStrength matches PostgresLearnerStateProvider's own thresholds", () => {
  assert.equal(deriveStrength(0.1), "weak");
  assert.equal(deriveStrength(0.39), "weak");
  assert.equal(deriveStrength(0.4), null);
  assert.equal(deriveStrength(0.6), null);
  assert.equal(deriveStrength(0.79), null);
  assert.equal(deriveStrength(0.8), "strong");
  assert.equal(deriveStrength(1), "strong");
});

test("groupByChapter orders chapters by curriculum sequence, not alphabetically", () => {
  const rows = [
    row({ conceptId: "c1", chapterId: "ch2", chapterTitle: "Fractions", chapterSequence: 2 }),
    row({ conceptId: "c2", chapterId: "ch1", chapterTitle: "Addition", chapterSequence: 1 }),
  ];
  const groups = groupByChapter(rows);
  assert.deepEqual(
    groups.map((g) => g.chapterTitle),
    ["Addition", "Fractions"],
  );
});

test("groupByChapter sorts concepts within a chapter weakest-mastery-first", () => {
  const rows = [
    row({ conceptId: "strong-one", masteryScore: 0.9 }),
    row({ conceptId: "weak-one", masteryScore: 0.2 }),
    row({ conceptId: "mid-one", masteryScore: 0.5 }),
  ];
  const [group] = groupByChapter(rows);
  assert.deepEqual(
    group.concepts.map((c) => c.conceptId),
    ["weak-one", "mid-one", "strong-one"],
  );
});

test("groupByChapter buckets concepts with no chapter under Other, sorted last", () => {
  const rows = [
    row({ conceptId: "c1", chapterId: "ch1", chapterTitle: "Addition", chapterSequence: 1 }),
    row({ conceptId: "c2", chapterId: null, chapterTitle: "", chapterSequence: 0 }),
  ];
  const groups = groupByChapter(rows);
  assert.deepEqual(
    groups.map((g) => g.chapterTitle),
    ["Addition", "Other"],
  );
});
