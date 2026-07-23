import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeChildProgress } from "@/lib/parent-portal/child-progress-summary";
import type { ChapterGroup, ConceptMasteryRow } from "@/lib/progress/progress-aggregation";

function concept(overrides: Partial<ConceptMasteryRow>): ConceptMasteryRow {
  return {
    conceptId: "c1",
    conceptName: "Concept",
    chapterId: "ch1",
    chapterTitle: "Chapter",
    chapterSequence: 1,
    masteryScore: 0.5,
    strength: null,
    ...overrides,
  };
}

test("summarizeChildProgress picks the weakest concepts overall as the headline, across chapters", () => {
  const chapters: ChapterGroup[] = [
    { chapterId: "ch1", chapterTitle: "Ch1", concepts: [concept({ conceptId: "a", masteryScore: 0.9 })] },
    { chapterId: "ch2", chapterTitle: "Ch2", concepts: [concept({ conceptId: "b", masteryScore: 0.1 })] },
  ];
  const result = summarizeChildProgress(chapters);
  assert.equal(result.headlineConcepts[0].conceptId, "b");
  assert.equal(result.headlineConcepts[1].conceptId, "a");
});

test("summarizeChildProgress caps the headline at 6 concepts", () => {
  const concepts = Array.from({ length: 10 }, (_, i) => concept({ conceptId: `c${i}`, masteryScore: i / 10 }));
  const chapters: ChapterGroup[] = [{ chapterId: "ch1", chapterTitle: "Ch1", concepts }];
  assert.equal(summarizeChildProgress(chapters).headlineConcepts.length, 6);
});

test("summarizeChildProgress splits weak/strong from strength, capped at 5 each", () => {
  const concepts = [
    ...Array.from({ length: 7 }, (_, i) => concept({ conceptId: `weak${i}`, strength: "weak", masteryScore: 0.1 })),
    ...Array.from({ length: 7 }, (_, i) => concept({ conceptId: `strong${i}`, strength: "strong", masteryScore: 0.9 })),
    concept({ conceptId: "developing", strength: null, masteryScore: 0.5 }),
  ];
  const chapters: ChapterGroup[] = [{ chapterId: "ch1", chapterTitle: "Ch1", concepts }];
  const result = summarizeChildProgress(chapters);
  assert.equal(result.weakConcepts.length, 5);
  assert.equal(result.strongConcepts.length, 5);
  assert.ok(result.weakConcepts.every((c) => c.strength === "weak"));
  assert.ok(result.strongConcepts.every((c) => c.strength === "strong"));
});

test("summarizeChildProgress returns empty lists for no activity", () => {
  const result = summarizeChildProgress([]);
  assert.deepEqual(result, { headlineConcepts: [], weakConcepts: [], strongConcepts: [] });
});
