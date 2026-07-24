import type { createClient } from "@/lib/supabase/server";
import { validateLessonInput } from "@/lib/teacher-lessons/lesson-plan-validation";
import { classBelongsToTeacher, conceptExists } from "@/lib/teacher-lessons/lesson-ownership-checks";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type UpdateLessonResult = { ok: true } | { ok: false; error: string };

export type UpdateLessonInput = {
  title: string;
  classId: string;
  grade: number | null;
  subject: string | null;
  conceptId: string | null;
  status: string;
  objectives: string;
  materials: string;
  procedure: string;
  notes: string;
};

/** updated_at is maintained by the lesson_plans_set_updated_at trigger (0020) -- not set here. */
export async function updateLesson(
  supabase: SupabaseServerClient,
  teacherId: string,
  lessonId: string,
  input: UpdateLessonInput,
): Promise<UpdateLessonResult> {
  const validation = validateLessonInput({ title: input.title, classId: input.classId, status: input.status });
  if (!validation.valid) return { ok: false, error: validation.error };

  if (!(await classBelongsToTeacher(supabase, teacherId, input.classId))) {
    return { ok: false, error: "That's not one of your classes." };
  }
  if (input.conceptId && !(await conceptExists(supabase, input.conceptId))) {
    return { ok: false, error: "That concept doesn't exist." };
  }

  const { data, error } = await supabase
    .from("lesson_plans")
    .update({
      title: input.title,
      class_id: input.classId,
      concept_id: input.conceptId,
      grade: input.grade,
      subject: input.subject,
      status: input.status,
      objectives: input.objectives,
      materials: input.materials,
      procedure: input.procedure,
      notes: input.notes,
    })
    .eq("teacher_id", teacherId)
    .eq("id", lessonId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: "Couldn't save that lesson plan." };
  if (!data) return { ok: false, error: "That's not one of your lesson plans." };
  return { ok: true };
}
