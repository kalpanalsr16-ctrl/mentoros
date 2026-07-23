import type { createClient } from "@/lib/supabase/server";
import { validateAssessmentInput, type AssessmentQuestion } from "@/lib/teacher-assessments/assessment-builder-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type CreateAssessmentResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * The builder flow is create-then-edit (mirroring CreateClassForm's own
 * "shell first, detail page to fill it in" convention): a title alone
 * is enough to create a row with an empty question list, which the
 * detail page's builder then fills in via updateAssessment. Still
 * validated here too, in case a caller ever posts questions directly.
 */
export async function createAssessment(
  supabase: SupabaseServerClient,
  teacherId: string,
  input: { title: string; questions: AssessmentQuestion[] },
): Promise<CreateAssessmentResult> {
  if (input.questions.length > 0) {
    const validation = validateAssessmentInput(input.title, input.questions);
    if (!validation.valid) return { ok: false, error: validation.error };
  } else if (input.title.trim().length === 0) {
    return { ok: false, error: "A title is required." };
  }

  const { data, error } = await supabase
    .from("assessments_authored")
    .insert({ teacher_id: teacherId, title: input.title, questions: input.questions })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "Couldn't create that assessment." };
  return { ok: true, id: data.id };
}
