import type { createClient } from "@/lib/supabase/server";
import { groupByChapter, type ChapterGroup } from "@/lib/progress/progress-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type CurriculumConceptFilters = { gradeId?: string; subjectId?: string };

/**
 * Concept picker data for `/studio/homework`'s concept selector --
 * published concepts only, grouped and sequenced by chapter. Reuses
 * groupByChapter() exactly as-is rather than re-deriving chapter
 * ordering a second time; masteryScore/strength are placeholders (this
 * list has no per-student mastery context, it's just "every concept a
 * teacher could assign"), never read by the page.
 *
 * `filters` is optional and additive -- added for Curriculum Explorer's
 * (G6) grade/subject narrowing. Homework Generator and Lesson Planner's
 * existing calls are unaffected since they pass no second argument.
 */
export async function listCurriculumConcepts(
  supabase: SupabaseServerClient,
  filters: CurriculumConceptFilters = {},
): Promise<ChapterGroup[]> {
  let chapterIdFilter: string[] | null = null;

  if (filters.gradeId) {
    const { data: chapters } = await supabase.from("chapters").select("id").eq("grade_id", filters.gradeId);
    chapterIdFilter = (chapters ?? []).map((c) => c.id);
  } else if (filters.subjectId) {
    const { data: grades } = await supabase.from("grades").select("id").eq("subject_id", filters.subjectId);
    const gradeIds = (grades ?? []).map((g) => g.id);
    const { data: chapters } =
      gradeIds.length > 0 ? await supabase.from("chapters").select("id").in("grade_id", gradeIds) : { data: [] };
    chapterIdFilter = (chapters ?? []).map((c) => c.id);
  }

  if (chapterIdFilter !== null && chapterIdFilter.length === 0) return [];

  let conceptsQuery = supabase.from("concepts").select("id, name, chapter_id").eq("status", "published");
  if (chapterIdFilter !== null) conceptsQuery = conceptsQuery.in("chapter_id", chapterIdFilter);

  const { data: concepts, error: conceptsError } = await conceptsQuery;

  if (conceptsError || !concepts || concepts.length === 0) return [];

  const chapterIds = [...new Set(concepts.map((c) => c.chapter_id).filter((id): id is string => id !== null))];
  const { data: chapters } =
    chapterIds.length > 0 ? await supabase.from("chapters").select("id, title, sequence").in("id", chapterIds) : { data: [] };

  const chapterById = new Map((chapters ?? []).map((c) => [c.id, c]));

  return groupByChapter(
    concepts.map((c) => {
      const chapter = c.chapter_id ? chapterById.get(c.chapter_id) : undefined;
      return {
        conceptId: c.id,
        conceptName: c.name,
        chapterId: c.chapter_id,
        chapterTitle: chapter?.title ?? "Other",
        chapterSequence: chapter?.sequence ?? Number.MAX_SAFE_INTEGER,
        masteryScore: 0,
        strength: null,
      };
    }),
  );
}
