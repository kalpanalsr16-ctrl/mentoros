import type { createClient } from "@/lib/supabase/server";
import { groupByChapter, type ChapterGroup } from "@/lib/progress/progress-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Concept picker data for `/studio/homework`'s concept selector --
 * published concepts only, grouped and sequenced by chapter. Reuses
 * groupByChapter() exactly as-is rather than re-deriving chapter
 * ordering a second time; masteryScore/strength are placeholders (this
 * list has no per-student mastery context, it's just "every concept a
 * teacher could assign"), never read by the page.
 */
export async function listCurriculumConcepts(supabase: SupabaseServerClient): Promise<ChapterGroup[]> {
  const { data: concepts, error: conceptsError } = await supabase
    .from("concepts")
    .select("id, name, chapter_id")
    .eq("status", "published");

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
