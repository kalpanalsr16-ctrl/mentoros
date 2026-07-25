import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type SubjectOption = { id: string; name: string };
export type GradeOption = { id: string; subjectId: string; gradeLevel: string };

/**
 * Filter dropdown options for `/studio/curriculum` (Epic G6) -- `subjects`
 * and `grades` are small, rarely-changing reference tables, so this is a
 * direct passthrough rather than an aggregation worth unit testing.
 */
export async function listCurriculumFilters(
  supabase: SupabaseServerClient,
): Promise<{ subjects: SubjectOption[]; grades: GradeOption[] }> {
  const [{ data: subjectRows }, { data: gradeRows }] = await Promise.all([
    supabase.from("subjects").select("id, name").order("name"),
    supabase.from("grades").select("id, subject_id, grade_level").order("grade_level"),
  ]);

  return {
    subjects: (subjectRows ?? []).map((s) => ({ id: s.id, name: s.name })),
    grades: (gradeRows ?? []).map((g) => ({ id: g.id, subjectId: g.subject_id, gradeLevel: g.grade_level })),
  };
}
