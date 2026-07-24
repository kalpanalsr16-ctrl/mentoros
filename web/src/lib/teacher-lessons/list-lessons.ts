import type { createClient } from "@/lib/supabase/server";
import type { LessonStatus } from "@/lib/teacher-lessons/lesson-plan-validation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type LessonSummary = {
  id: string;
  title: string;
  classId: string;
  className: string;
  status: LessonStatus;
  createdAt: string;
};

/**
 * `/studio/lessons`'s list -- RLS (0020) already scopes this to the
 * caller's own rows. `classId` is an optional filter for the "organize
 * by class" requirement -- same query-param convention as
 * Misconceptions/Analytics' ClassPicker, just applied server-side here
 * rather than via a separate picker component (this page isn't
 * read-only like those, so its class filter lives alongside a
 * form, not as a page-level navigation control).
 */
export async function listLessons(supabase: SupabaseServerClient, teacherId: string, classId?: string): Promise<LessonSummary[] | null> {
  let query = supabase
    .from("lesson_plans")
    .select("id, title, class_id, status, created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (classId) {
    query = query.eq("class_id", classId);
  }

  const { data, error } = await query;
  if (error) return null;

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const classIds = [...new Set(rows.map((r) => r.class_id))];
  const { data: classRows } = await supabase.from("classes").select("id, name").in("id", classIds);
  const nameById = new Map((classRows ?? []).map((c) => [c.id, c.name]));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    classId: r.class_id,
    className: nameById.get(r.class_id) ?? "Unknown class",
    status: r.status as LessonStatus,
    createdAt: r.created_at,
  }));
}
