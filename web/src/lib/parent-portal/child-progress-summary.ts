import type { ChapterGroup, ConceptMasteryRow } from "@/lib/progress/progress-aggregation";

export type ChildProgressSummary = {
  headlineConcepts: ConceptMasteryRow[];
  weakConcepts: ConceptMasteryRow[];
  strongConcepts: ConceptMasteryRow[];
};

const HEADLINE_LIMIT = 6;
const STRENGTH_LIST_LIMIT = 5;

/**
 * The parent's Progress section is a simplified headline, not the
 * student's own full per-chapter grid (04_Parent_Portal.md: "fewer
 * concepts shown at once than the student's own view -- a parent needs
 * the headline, not every concept"). Flattens getProgressData()'s
 * chapter grouping and surfaces the weakest concepts overall, plus
 * short weak/strong lists for the Strengths/Weaknesses section -- same
 * underlying rows, three different cuts of them.
 */
export function summarizeChildProgress(chapters: ChapterGroup[]): ChildProgressSummary {
  const allConcepts = chapters.flatMap((c) => c.concepts);
  const byMasteryAscending = [...allConcepts].sort((a, b) => a.masteryScore - b.masteryScore);

  return {
    headlineConcepts: byMasteryAscending.slice(0, HEADLINE_LIMIT),
    weakConcepts: allConcepts.filter((c) => c.strength === "weak").slice(0, STRENGTH_LIST_LIMIT),
    strongConcepts: allConcepts.filter((c) => c.strength === "strong").slice(0, STRENGTH_LIST_LIMIT),
  };
}
