import type { createClient } from "@/lib/supabase/server";
import type { LessonStatus } from "@/lib/teacher-lessons/lesson-plan-validation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type LessonDetail = {
  id: string;
  title: string;
  classId: string;
  conceptId: string | null;
  grade: number | null;
  subject: string | null;
  status: LessonStatus;
  objectives: string;
  materials: string;
  procedure: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * A nonexistent lesson id and someone else's lesson id both resolve to
 * `null` here -- RLS (0020) already filters "not yours" out of the
 * query entirely, same collapse-to-404 pattern as get-assessment.ts.
 */
export async function getLesson(supabase: SupabaseServerClient, teacherId: string, lessonId: string): Promise<LessonDetail | null> {
  const { data, error } = await supabase
    .from("lesson_plans")
    .select("id, title, class_id, concept_id, grade, subject, status, objectives, materials, procedure, notes, created_at, updated_at")
    .eq("teacher_id", teacherId)
    .eq("id", lessonId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    classId: data.class_id,
    conceptId: data.concept_id,
    grade: data.grade,
    subject: data.subject,
    status: data.status as LessonStatus,
    objectives: data.objectives,
    materials: data.materials,
    procedure: data.procedure,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
