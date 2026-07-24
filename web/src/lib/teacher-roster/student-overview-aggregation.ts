import { groupByChapter, type ChapterGroup, type ConceptMasteryRow } from "@/lib/progress/progress-aggregation";
import { computeAtRisk } from "@/lib/teacher-roster/roster-aggregation";

/**
 * Pure aggregation for Student Overview (Epic G4) -- docs/ui-architecture/
 * 03_Teacher_Studio.md's Student Overview section. Reuses groupByChapter/
 * ConceptMasteryRow from the student-facing Progress screen unmodified
 * ("same pattern, teacher-facing wrapper," per the doc's own words) and
 * computeAtRisk from roster-aggregation.ts so a student is never flagged
 * "at risk" here but not on their teacher's Class Overview roster, or
 * vice versa.
 */

export type SuggestedAction =
  | { type: "start" }
  | { type: "revise"; conceptId: string; conceptName: string }
  | { type: "none" };

/**
 * Deterministic, rule-based -- no AI-generated summary (per the sprint's
 * own instruction). Not-started students get an encouragement prompt,
 * at-risk students get a pointer at their single weakest concept, anyone
 * else gets no action at all rather than a manufactured one. `conceptId`
 * (added for Epic G12's Homework Generator deep-link) was added
 * alongside `conceptName` here rather than duplicated as a second,
 * parallel "find the weakest concept" implementation in the
 * interventions module.
 */
export function deriveSuggestedAction(masteryRows: ConceptMasteryRow[]): SuggestedAction {
  if (masteryRows.length === 0) return { type: "start" };
  if (!computeAtRisk(masteryRows.map((r) => ({ masteryScore: r.masteryScore })))) return { type: "none" };
  const weakest = [...masteryRows].sort((a, b) => a.masteryScore - b.masteryScore)[0];
  return { type: "revise", conceptId: weakest.conceptId, conceptName: weakest.conceptName };
}

export function formatSuggestedAction(action: SuggestedAction, studentName: string): string | null {
  switch (action.type) {
    case "start":
      return `Encourage ${studentName} to start practicing.`;
    case "revise":
      return `Suggest revision on ${action.conceptName}.`;
    case "none":
      return null;
  }
}

/** Dedupes across learner_concept_mastery's per-concept `common_mistakes` and recent assessment events' `misconceptions`, preserving first-seen order. */
export function buildMisconceptionList(commonMistakesByConcept: string[][], assessmentMisconceptions: string[][]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of [...commonMistakesByConcept, ...assessmentMisconceptions]) {
    for (const item of list) {
      if (item && !seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
  }
  return result;
}

export type StudentOverviewSummary = {
  chapters: ChapterGroup[];
  atRisk: boolean;
  suggestedAction: SuggestedAction;
  misconceptions: string[];
};

export function buildStudentOverview(
  masteryRows: ConceptMasteryRow[],
  commonMistakesByConcept: string[][],
  assessmentMisconceptions: string[][],
): StudentOverviewSummary {
  return {
    chapters: groupByChapter(masteryRows),
    atRisk: computeAtRisk(masteryRows.map((r) => ({ masteryScore: r.masteryScore }))),
    suggestedAction: deriveSuggestedAction(masteryRows),
    misconceptions: buildMisconceptionList(commonMistakesByConcept, assessmentMisconceptions),
  };
}
