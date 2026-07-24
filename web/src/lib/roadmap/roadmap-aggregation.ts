import { HIGH_MASTERY_THRESHOLD } from "@/lib/agents/planning-agent";

export type ChapterRow = { id: string; title: string; sequence: number };
export type ConceptRow = { id: string; name: string; chapterId: string | null };
export type PrerequisiteEdge = { fromConceptId: string; toConceptId: string };
export type MasteryRow = { conceptId: string; masteryScore: number };

export type RoadmapNodeStatus = "done" | "current" | "next";
export type RoadmapNode = {
  conceptId: string;
  conceptName: string;
  status: RoadmapNodeStatus;
  /** 0-100, for ProgressRing -- 0 for a "next" node with no mastery row yet. */
  masteryScore: number;
};
export type RoadmapChapter = { chapterId: string; chapterTitle: string; nodes: RoadmapNode[] };

export type RoadmapResult =
  | { degraded: false; chapters: RoadmapChapter[] }
  | { degraded: true; conceptNames: string[] };

/**
 * Topologically sorts one chapter's concepts using only `prerequisite_of`
 * edges (not `builds_on`/`related_to`/`part_of` -- those aren't strict
 * ordering constraints, per 0002_curriculum_foundation.sql's own type
 * distinctions). Returns null on a cycle, the trigger for the doc's
 * documented fallback (02_Student_Experience.md's Learning Roadmap error
 * state: "falls back to a plain list of concept names... never a broken/
 * half-drawn path graphic").
 */
function topologicalSortChapter(concepts: ConceptRow[], edges: PrerequisiteEdge[]): ConceptRow[] | null {
  const conceptIds = new Set(concepts.map((c) => c.id));
  const inDegree = new Map(concepts.map((c) => [c.id, 0]));
  const dependents = new Map<string, string[]>(concepts.map((c) => [c.id, []]));

  for (const edge of edges) {
    if (!conceptIds.has(edge.fromConceptId) || !conceptIds.has(edge.toConceptId)) continue;
    dependents.get(edge.fromConceptId)!.push(edge.toConceptId);
    inDegree.set(edge.toConceptId, (inDegree.get(edge.toConceptId) ?? 0) + 1);
  }

  // Deterministic: concepts with no remaining prerequisite are visited in
  // id order, not insertion order, so the result doesn't depend on
  // whatever order the DB happened to return rows in.
  const queue = concepts.filter((c) => inDegree.get(c.id) === 0).sort((a, b) => a.id.localeCompare(b.id));
  const conceptById = new Map(concepts.map((c) => [c.id, c]));
  const ordered: ConceptRow[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    ordered.push(current);
    const next = [...(dependents.get(current.id) ?? [])].sort();
    for (const dependentId of next) {
      const remaining = inDegree.get(dependentId)! - 1;
      inDegree.set(dependentId, remaining);
      if (remaining === 0) {
        queue.push(conceptById.get(dependentId)!);
        queue.sort((a, b) => a.id.localeCompare(b.id));
      }
    }
  }

  return ordered.length === concepts.length ? ordered : null;
}

/**
 * Builds the Learning Roadmap's chapter -> concept path (Epic F3). "Current
 * position" is the first concept, walking chapters in `chapters.sequence`
 * order and each chapter's own concepts in prerequisite order, whose
 * mastery is below HIGH_MASTERY_THRESHOLD (or has no mastery row at all)
 * -- everything before it is therefore already mastered ("done"),
 * everything after is "next". If every concept is mastered, nothing is
 * marked "current". A cycle in `concept_relationships` (which should never
 * happen given the seed data, but this function must never assume clean
 * data) degrades to a flat concept-name list rather than guessing at an
 * order, per the doc's own error-state instruction.
 */
export function buildRoadmap(
  chapters: ChapterRow[],
  concepts: ConceptRow[],
  edges: PrerequisiteEdge[],
  masteryRows: MasteryRow[],
): RoadmapResult {
  const masteryByConcept = new Map(masteryRows.map((m) => [m.conceptId, m.masteryScore]));
  const sortedChapters = [...chapters].sort((a, b) => a.sequence - b.sequence);

  const chapterResults: { chapter: ChapterRow; ordered: ConceptRow[] }[] = [];
  for (const chapter of sortedChapters) {
    const chapterConcepts = concepts.filter((c) => c.chapterId === chapter.id);
    const ordered = topologicalSortChapter(chapterConcepts, edges);
    if (!ordered) {
      return { degraded: true, conceptNames: concepts.map((c) => c.name) };
    }
    chapterResults.push({ chapter, ordered });
  }

  const fullSequence = chapterResults.flatMap((r) => r.ordered);
  const currentIndex = fullSequence.findIndex(
    (c) => (masteryByConcept.get(c.id) ?? 0) < HIGH_MASTERY_THRESHOLD,
  );

  function statusFor(index: number): RoadmapNodeStatus {
    if (currentIndex === -1) return "done";
    if (index < currentIndex) return "done";
    if (index === currentIndex) return "current";
    return "next";
  }

  let cursor = 0;
  const roadmapChapters: RoadmapChapter[] = chapterResults.map(({ chapter, ordered }) => ({
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    nodes: ordered.map((concept) => {
      const index = cursor++;
      return {
        conceptId: concept.id,
        conceptName: concept.name,
        status: statusFor(index),
        masteryScore: Math.round((masteryByConcept.get(concept.id) ?? 0) * 100),
      };
    }),
  }));

  return { degraded: false, chapters: roadmapChapters };
}
