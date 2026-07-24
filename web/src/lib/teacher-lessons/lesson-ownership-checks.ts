import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Shared by create-lesson.ts and update-lesson.ts -- RLS alone can't
 * confirm a *given* class_id belongs to the caller at write time (it
 * only scopes what's already been inserted), so this is the same
 * explicit application-layer check the roster-mutation routes already
 * use for `classes` (e.g. /api/teacher/classes/:classId/students).
 */
export async function classBelongsToTeacher(supabase: SupabaseServerClient, teacherId: string, classId: string): Promise<boolean> {
  const { data } = await supabase.from("classes").select("id").eq("id", classId).eq("teacher_id", teacherId).maybeSingle();
  return !!data;
}

/** concepts is readable by any authenticated user (0002_curriculum_foundation.sql) -- existence alone is what's checked, no ownership concept applies. */
export async function conceptExists(supabase: SupabaseServerClient, conceptId: string): Promise<boolean> {
  const { data } = await supabase.from("concepts").select("id").eq("id", conceptId).maybeSingle();
  return !!data;
}
