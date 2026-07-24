import type { createClient } from "@/lib/supabase/server";
import { groupByChapter, deriveStrength, type ConceptMasteryRow, type ChapterGroup } from "@/lib/progress/progress-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ProgressData = {
  hasActivity: boolean;
  chapters: ChapterGroup[];
};

/**
 * Same source LearnerStateProvider already reads for the live pipeline
 * (docs/ui-architecture/02_Student_Experience.md's Progress section) --
 * this is a second reader of learner_concept_mastery, not a new write
 * path. Three flat queries + an in-memory join, mirroring
 * get-dashboard-data.ts's own shape rather than a relational embedded
 * select.
 */
export async function getProgressData(supabase: SupabaseServerClient, studentId: string): Promise<ProgressData | null> {
  const { data: masteryRows, error: masteryError } = await supabase
    .from("learner_concept_mastery")
    .select("concept_id, mastery_score")
    .eq("student_id", studentId);

  if (masteryError) {
    return null;
  }

  const rows = masteryRows ?? [];
  if (rows.length === 0) {
    return { hasActivity: false, chapters: [] };
  }

  const conceptIds = rows.map((r) => r.concept_id);
  const { data: concepts, error: conceptsError } = await supabase
    .from("concepts")
    .select("id, name, chapter_id")
    .in("id", conceptIds);

  if (conceptsError) {
    return null;
  }

  const chapterIds = [...new Set((concepts ?? []).map((c) => c.chapter_id).filter((id): id is string => id !== null))];
  const { data: chapters, error: chaptersError } =
    chapterIds.length > 0
      ? await supabase.from("chapters").select("id, title, sequence").in("id", chapterIds)
      : { data: [], error: null };

  if (chaptersError) {
    return null;
  }

  const conceptById = new Map((concepts ?? []).map((c) => [c.id, c]));
  const chapterById = new Map((chapters ?? []).map((c) => [c.id, c]));

  const conceptMasteryRows: ConceptMasteryRow[] = rows.map((r) => {
    const concept = conceptById.get(r.concept_id);
    const chapter = concept?.chapter_id ? chapterById.get(concept.chapter_id) : undefined;
    const masteryScore = Number(r.mastery_score);

    return {
      conceptId: r.concept_id,
      conceptName: concept?.name ?? r.concept_id,
      chapterId: concept?.chapter_id ?? null,
      chapterTitle: chapter?.title ?? "Other",
      chapterSequence: chapter?.sequence ?? Number.MAX_SAFE_INTEGER,
      masteryScore,
      strength: deriveStrength(masteryScore),
    };
  });

  return { hasActivity: true, chapters: groupByChapter(conceptMasteryRows) };
}
