import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type DeleteAssessmentResult = { ok: true } | { ok: false; error: string };

export async function deleteAssessment(supabase: SupabaseServerClient, teacherId: string, assessmentId: string): Promise<DeleteAssessmentResult> {
  const { data, error } = await supabase
    .from("assessments_authored")
    .delete()
    .eq("teacher_id", teacherId)
    .eq("id", assessmentId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: "Couldn't delete that assessment." };
  if (!data) return { ok: false, error: "That's not one of your assessments." };
  return { ok: true };
}
