import type { createClient } from "@/lib/supabase/server";
import { validateAssessmentInput, type AssessmentQuestion } from "@/lib/teacher-assessments/assessment-builder-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type UpdateAssessmentResult = { ok: true } | { ok: false; error: string };

export async function updateAssessment(
  supabase: SupabaseServerClient,
  teacherId: string,
  assessmentId: string,
  input: { title: string; questions: AssessmentQuestion[] },
): Promise<UpdateAssessmentResult> {
  const validation = validateAssessmentInput(input.title, input.questions);
  if (!validation.valid) return { ok: false, error: validation.error };

  const { data, error } = await supabase
    .from("assessments_authored")
    .update({ title: input.title, questions: input.questions, updated_at: new Date().toISOString() })
    .eq("teacher_id", teacherId)
    .eq("id", assessmentId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: "Couldn't save that assessment." };
  if (!data) return { ok: false, error: "That's not one of your assessments." };
  return { ok: true };
}
