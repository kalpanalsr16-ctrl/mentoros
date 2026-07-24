import type { createClient } from "@/lib/supabase/server";
import type { AssessmentQuestion } from "@/lib/teacher-assessments/assessment-builder-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AssessmentDetail = {
  id: string;
  title: string;
  questions: AssessmentQuestion[];
  createdAt: string;
};

/**
 * A nonexistent assessment id and someone else's assessment id both
 * resolve to `null` here -- RLS (0019) already filters "not yours" out
 * of the query entirely, so the two are indistinguishable at this layer
 * by construction, same single-403-equivalent pattern as
 * get-class-overview.ts et al.
 */
export async function getAssessment(supabase: SupabaseServerClient, teacherId: string, assessmentId: string): Promise<AssessmentDetail | null> {
  const { data, error } = await supabase
    .from("assessments_authored")
    .select("id, title, questions, created_at")
    .eq("teacher_id", teacherId)
    .eq("id", assessmentId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    questions: (data.questions as AssessmentQuestion[]) ?? [],
    createdAt: data.created_at,
  };
}
