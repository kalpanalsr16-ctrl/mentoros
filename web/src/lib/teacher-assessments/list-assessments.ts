import type { createClient } from "@/lib/supabase/server";
import { computeTotalPoints, type AssessmentQuestion, type AssessmentSummary } from "@/lib/teacher-assessments/assessment-builder-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** `/studio/assessments`'s list -- RLS (0019) already scopes this to the caller's own rows. */
export async function listAssessments(supabase: SupabaseServerClient, teacherId: string): Promise<AssessmentSummary[] | null> {
  const { data, error } = await supabase
    .from("assessments_authored")
    .select("id, title, questions, created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) return null;

  return (data ?? []).map((row) => {
    const questions = (row.questions as AssessmentQuestion[]) ?? [];
    return {
      id: row.id,
      title: row.title,
      questionCount: questions.length,
      totalPoints: computeTotalPoints(questions),
      createdAt: row.created_at,
    };
  });
}
