import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type DeleteLessonResult = { ok: true } | { ok: false; error: string };

/** Hard delete -- no downstream data references lesson_plans yet, per the approved design. */
export async function deleteLesson(supabase: SupabaseServerClient, teacherId: string, lessonId: string): Promise<DeleteLessonResult> {
  const { data, error } = await supabase
    .from("lesson_plans")
    .delete()
    .eq("teacher_id", teacherId)
    .eq("id", lessonId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: "Couldn't delete that lesson plan." };
  if (!data) return { ok: false, error: "That's not one of your lesson plans." };
  return { ok: true };
}
