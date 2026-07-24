import type { createClient } from "@/lib/supabase/server";
import { validateLessonInput } from "@/lib/teacher-lessons/lesson-plan-validation";
import { classBelongsToTeacher, conceptExists } from "@/lib/teacher-lessons/lesson-ownership-checks";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type CreateLessonResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Create-then-edit, same convention as Assessment Builder: title +
 * class (+ optional grade/subject/concept) creates the shell; the
 * detail page's editor fills in objectives/materials/procedure/notes
 * afterward via updateLesson. Status always starts 'draft' -- a
 * teacher publishes explicitly later, never at creation.
 */
export async function createLesson(
  supabase: SupabaseServerClient,
  teacherId: string,
  input: { title: string; classId: string; grade: number | null; subject: string | null; conceptId: string | null },
): Promise<CreateLessonResult> {
  const validation = validateLessonInput({ title: input.title, classId: input.classId, status: "draft" });
  if (!validation.valid) return { ok: false, error: validation.error };

  if (!(await classBelongsToTeacher(supabase, teacherId, input.classId))) {
    return { ok: false, error: "That's not one of your classes." };
  }
  if (input.conceptId && !(await conceptExists(supabase, input.conceptId))) {
    return { ok: false, error: "That concept doesn't exist." };
  }

  const { data, error } = await supabase
    .from("lesson_plans")
    .insert({
      teacher_id: teacherId,
      class_id: input.classId,
      concept_id: input.conceptId,
      title: input.title,
      grade: input.grade,
      subject: input.subject,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "Couldn't create that lesson plan." };
  return { ok: true, id: data.id };
}
