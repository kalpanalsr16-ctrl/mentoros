import { LOW_MASTERY_THRESHOLD } from "@/lib/learner/postgres-learner-state-provider";
import { HIGH_MASTERY_THRESHOLD } from "@/lib/agents/planning-agent";

/**
 * Pure aggregation for GET /api/student/progress (Sprint 6, Epic F4) --
 * same DB-free, unit-testable split as dashboard-aggregation.ts and
 * transparency-provider.ts's buildTraceView.
 */

export type MasteryStrength = "weak" | "strong" | null;

export type ConceptMasteryRow = {
  conceptId: string;
  conceptName: string;
  chapterId: string | null;
  chapterTitle: string;
  chapterSequence: number;
  masteryScore: number;
  strength: MasteryStrength;
};

export type ChapterGroup = {
  chapterId: string;
  chapterTitle: string;
  concepts: ConceptMasteryRow[];
};

/**
 * "Grouped by chapter, weak concepts surfaced first" (docs/ui-architecture/
 * 02_Student_Experience.md's Progress section) -- read as a per-chapter
 * sort order (weakest mastery first within each group), since the doc
 * doesn't describe a separate "weak concepts" section of its own.
 * Chapters are ordered by their curriculum sequence, not alphabetically,
 * so the page reads in the same order the curriculum itself is taught.
 * Concepts with no chapter_id (should not happen in practice, but
 * `concepts.chapter_id` is nullable per 0002_curriculum_foundation.sql)
 * are grouped under "Other," sorted last.
 */
export function groupByChapter(rows: ConceptMasteryRow[]): ChapterGroup[] {
  const groups = new Map<string, ChapterGroup>();

  for (const row of rows) {
    const key = row.chapterId ?? "__other__";
    if (!groups.has(key)) {
      groups.set(key, {
        chapterId: key,
        chapterTitle: row.chapterId ? row.chapterTitle : "Other",
        concepts: [],
      });
    }
    groups.get(key)!.concepts.push(row);
  }

  const sequenceByKey = new Map<string, number>();
  for (const row of rows) {
    const key = row.chapterId ?? "__other__";
    if (!sequenceByKey.has(key)) {
      sequenceByKey.set(key, row.chapterId ? row.chapterSequence : Number.MAX_SAFE_INTEGER);
    }
  }

  const sortedGroups = [...groups.values()].sort(
    (a, b) => (sequenceByKey.get(a.chapterId) ?? 0) - (sequenceByKey.get(b.chapterId) ?? 0),
  );

  for (const group of sortedGroups) {
    group.concepts.sort((a, b) => a.masteryScore - b.masteryScore);
  }

  return sortedGroups;
}

/**
 * The exact same two thresholds PostgresLearnerStateProvider already
 * derives weakConceptIds/strongConceptIds from -- a concept between the
 * two bands ("developing") gets no label at all here, same as it gets
 * no derived list membership there. Not a third label, just the honest
 * absence of one.
 */
export function deriveStrength(masteryScore: number): MasteryStrength {
  if (masteryScore < LOW_MASTERY_THRESHOLD) return "weak";
  if (masteryScore >= HIGH_MASTERY_THRESHOLD) return "strong";
  return null;
}
