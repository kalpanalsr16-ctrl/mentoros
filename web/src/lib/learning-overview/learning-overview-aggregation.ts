import { deriveStrength } from "@/lib/progress/progress-aggregation";
import { deriveRetention, classifyRetention, type RetentionClassification } from "@/lib/retention/retention-aggregation";
import { buildConceptReasoning } from "@/lib/learning-journey/concept-journey-aggregation";

/**
 * My Learning's status model (learner UI redesign) -- deliberately not
 * Roadmap's done/current/next (that's a single sequential "what's next"
 * position, only ever one concept per curriculum). This is a per-concept
 * classification against the same two real thresholds every other
 * mastery-derived UI in this codebase already uses
 * (progress-aggregation.ts's deriveStrength) -- four states, all directly
 * derivable from learner_concept_mastery, nothing fabricated:
 *   NEW         -- no mastery row for this concept at all
 *   STRUGGLING  -- row exists, mastery < LOW_MASTERY_THRESHOLD
 *   LEARNING    -- row exists, between the two thresholds
 *   MASTERED    -- row exists, mastery >= HIGH_MASTERY_THRESHOLD
 * There is no fifth "needs revision" state -- no code anywhere persists
 * a time-decay/staleness signal, and inventing a day-threshold here would
 * be a business rule dressed up as derived data.
 */
export type ConceptStatus = "new" | "learning" | "mastered" | "struggling";

export type ChapterRow = { id: string; title: string; sequence: number };
export type ConceptRow = { id: string; name: string; chapterId: string | null };
export type MasteryRow = {
  conceptId: string;
  masteryScore: number;
  lastPracticedAt: string | null;
  commonMistakes?: string[];
  attempts?: number;
};

export type OverviewConcept = {
  conceptId: string;
  conceptName: string;
  status: ConceptStatus;
  /** 0-100, 0 for a NEW concept (no row yet) -- matches ProgressRing's existing "no fake ring at 0%" convention only mattering for a real attempt; NEW concepts don't render a ring at all in the UI. */
  masteryScore: number;
  /** 0-100, a recency-decayed estimate of masteryScore -- see retention-aggregation.ts. `null` for a NEW concept (nothing to decay). */
  retentionScore: number | null;
  retentionStatus: RetentionClassification | null;
  lastPracticedAt: string | null;
  commonMistakes: string[];
  attempts: number;
  /** "Why MentorOS thinks this" -- see buildConceptReasoning; built only from real fields. */
  reasoning: string;
};

export type OverviewChapter = {
  chapterId: string;
  chapterTitle: string;
  concepts: OverviewConcept[];
  /** Average mastery across this chapter's concepts with real attempts (NEW concepts excluded) -- null when nothing in the chapter has been attempted yet. */
  masteredPercent: number | null;
};

/** Exported for reuse by Concept Detail (get-concept-journey.ts), which needs the identical classification for a single concept rather than a whole chapter. */
export function statusFor(masteryScore: number | undefined): ConceptStatus {
  if (masteryScore === undefined) return "new";
  const strength = deriveStrength(masteryScore);
  if (strength === "weak") return "struggling";
  if (strength === "strong") return "mastered";
  return "learning";
}

/**
 * Groups the FULL published curriculum by chapter (every concept, not
 * just ones the student has touched -- that's the actual difference from
 * lib/progress/progress-aggregation.ts's groupByChapter, which only ever
 * sees rows a student already has mastery data for and so can never
 * represent "new"). Chapters ordered by curriculum sequence; concepts
 * within a chapter ordered struggling-first, then learning, then new,
 * then mastered -- surfacing what needs attention before what's already
 * solid, same "weakest first" principle Progress already uses.
 */
export function buildLearningOverview(
  chapters: ChapterRow[],
  concepts: ConceptRow[],
  masteryRows: MasteryRow[],
  now: Date = new Date(),
): OverviewChapter[] {
  const masteryByConcept = new Map(masteryRows.map((m) => [m.conceptId, m]));
  const chaptersById = new Map(chapters.map((c) => [c.id, c]));

  const grouped = new Map<string, OverviewConcept[]>();
  for (const concept of concepts) {
    const key = concept.chapterId ?? "__other__";
    const mastery = masteryByConcept.get(concept.id);
    const retentionScore = mastery ? deriveRetention(mastery.masteryScore, mastery.lastPracticedAt, now) : null;
    const masteryScore = mastery ? Math.round(mastery.masteryScore * 100) : 0;
    const attempts = mastery?.attempts ?? 0;
    const lastPracticedAt = mastery?.lastPracticedAt ?? null;
    const commonMistakes = mastery?.commonMistakes ?? [];
    const overviewConcept: OverviewConcept = {
      conceptId: concept.id,
      conceptName: concept.name,
      status: statusFor(mastery?.masteryScore),
      masteryScore,
      retentionScore: retentionScore !== null ? Math.round(retentionScore * 100) : null,
      retentionStatus: retentionScore !== null ? classifyRetention(retentionScore) : null,
      lastPracticedAt,
      commonMistakes,
      attempts,
      reasoning: buildConceptReasoning(attempts, masteryScore, lastPracticedAt, commonMistakes, now),
    };
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(overviewConcept);
  }

  const statusRank: Record<ConceptStatus, number> = { struggling: 0, learning: 1, new: 2, mastered: 3 };

  const result: OverviewChapter[] = [];
  for (const [chapterId, chapterConcepts] of grouped) {
    const chapter = chaptersById.get(chapterId);
    chapterConcepts.sort((a, b) => statusRank[a.status] - statusRank[b.status]);

    const attempted = chapterConcepts.filter((c) => c.status !== "new");
    const masteredPercent =
      attempted.length > 0 ? Math.round(attempted.reduce((sum, c) => sum + c.masteryScore, 0) / attempted.length) : null;

    result.push({
      chapterId,
      chapterTitle: chapter?.title ?? "Other",
      concepts: chapterConcepts,
      masteredPercent,
    });
  }

  result.sort((a, b) => (chaptersById.get(a.chapterId)?.sequence ?? Number.MAX_SAFE_INTEGER) - (chaptersById.get(b.chapterId)?.sequence ?? Number.MAX_SAFE_INTEGER));

  return result;
}
