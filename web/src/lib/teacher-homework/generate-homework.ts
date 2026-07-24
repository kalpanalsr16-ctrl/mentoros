import type { createClient } from "@/lib/supabase/server";
import { createPostgresKnowledgeProvider } from "@/lib/knowledge/postgres-knowledge-provider";
import { createPracticeSet, type PracticeDifficulty, type PracticeSet } from "@/lib/agents/practice-agent";
import { generatePracticeSet } from "@/lib/llm/client";
import { buildHomeworkLearningPlan, buildHomeworkPersonalizationProfile } from "@/lib/teacher-homework/homework-context";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type GenerateHomeworkInput = {
  conceptId: string;
  difficulty: PracticeDifficulty;
  studentId?: string;
  classId?: string;
};

export type GenerateHomeworkResult =
  | { status: "ok"; data: PracticeSet }
  | { status: "forbidden" }
  | { status: "concept_not_found" }
  | { status: "generation_failed"; reason: string };

/**
 * `/studio/homework` (Epic G13) -- docs/ui-architecture/03_Teacher_Studio.md's
 * Homework Generator section: "reuses Practice Agent's existing
 * generation pattern (createPracticeSet's injected-function seam)
 * through a new, teacher-facing wrapper -- not a call from inside the
 * student pipeline, and not a modification of practice-agent.ts
 * itself." This is a genuine, real Claude API call (via the same
 * generatePracticeSet already used by /api/chat) -- no mock, no
 * placeholder.
 *
 * Exactly one of studentId/classId is expected (the route validates
 * that); ownership is checked the same single-403 way as every other
 * teacher-roster wrapper this sprint series.
 */
export async function generateHomework(
  supabase: SupabaseServerClient,
  teacherId: string,
  input: GenerateHomeworkInput,
): Promise<GenerateHomeworkResult> {
  let studentProfile: { confidence?: "Low" | "Medium" | "High"; preferredLearningStyle?: string } | null = null;

  if (input.studentId) {
    const { data: teacherClasses } = await supabase.from("classes").select("id").eq("teacher_id", teacherId);
    const teacherClassIds = (teacherClasses ?? []).map((c) => c.id);
    const { data: linkRows } =
      teacherClassIds.length > 0
        ? await supabase.from("class_students").select("class_id").eq("student_id", input.studentId).in("class_id", teacherClassIds)
        : { data: [] };

    if (!linkRows || linkRows.length === 0) return { status: "forbidden" };

    const { data: profileRow } = await supabase
      .from("learner_profiles")
      .select("confidence, preferred_learning_style")
      .eq("id", input.studentId)
      .maybeSingle();

    studentProfile = profileRow
      ? {
          confidence: (profileRow.confidence as "Low" | "Medium" | "High" | null) ?? undefined,
          preferredLearningStyle: profileRow.preferred_learning_style ?? undefined,
        }
      : null;
  } else if (input.classId) {
    const { data: classRow } = await supabase.from("classes").select("id").eq("id", input.classId).eq("teacher_id", teacherId).maybeSingle();
    if (!classRow) return { status: "forbidden" };
  }

  const knowledgeProvider = createPostgresKnowledgeProvider(supabase);
  const concept = await knowledgeProvider.getConcept(input.conceptId);
  if (!concept) return { status: "concept_not_found" };

  const [learningObjectives, misconceptions, teachingStrategies] = await Promise.all([
    knowledgeProvider.getLearningObjectives(input.conceptId),
    knowledgeProvider.getMisconceptions(input.conceptId),
    knowledgeProvider.getTeachingStrategies(input.conceptId),
  ]);

  const plan = buildHomeworkLearningPlan(input.difficulty);
  const personalizationProfile = buildHomeworkPersonalizationProfile(
    studentProfile as Parameters<typeof buildHomeworkPersonalizationProfile>[0],
    input.difficulty,
  );

  const result = await createPracticeSet(
    {
      concept,
      learningObjectives,
      misconceptions,
      teachingStrategies,
      plan,
      personalizationProfile,
      history: [{ role: "user", content: `Generate a ${input.difficulty.toLowerCase()}-difficulty homework practice set on "${concept.name}".` }],
    },
    generatePracticeSet,
  );

  if (!result.success) return { status: "generation_failed", reason: result.reason };
  return { status: "ok", data: result.response };
}
