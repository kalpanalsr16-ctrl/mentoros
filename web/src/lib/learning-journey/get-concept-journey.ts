import type { createClient } from "@/lib/supabase/server";
import { buildConceptJourney, buildConceptReasoning, type ConceptJourney } from "@/lib/learning-journey/concept-journey-aggregation";
import { statusFor, type ConceptStatus } from "@/lib/learning-overview/learning-overview-aggregation";
import { deriveRetention, classifyRetention, type RetentionClassification } from "@/lib/retention/retention-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ConceptDetail = {
  conceptName: string;
  status: ConceptStatus;
  masteryScore: number;
  retentionScore: number | null;
  retentionStatus: RetentionClassification | null;
  attempts: number;
  lastPracticedAt: string | null;
  commonMistakes: string[];
  reasoning: string;
  journey: ConceptJourney;
};

/**
 * Reads this student's mastery row for one concept plus their own
 * practice_generated/assessment_completed events, filtered in memory to
 * this conceptId (both event types log a real conceptId -- see
 * concept-journey-aggregation.ts's doc comment for the one event type
 * that doesn't and is therefore excluded).
 */
export async function getConceptDetail(
  supabase: SupabaseServerClient,
  studentId: string,
  conceptId: string,
  now: Date = new Date(),
): Promise<ConceptDetail | null> {
  const [conceptRes, masteryRes, practiceRes, assessmentRes] = await Promise.all([
    supabase.from("concepts").select("id, name").eq("id", conceptId).maybeSingle(),
    supabase
      .from("learner_concept_mastery")
      .select("mastery_score, attempts, last_practiced_at, common_mistakes")
      .eq("student_id", studentId)
      .eq("concept_id", conceptId)
      .maybeSingle(),
    supabase.from("events").select("id, created_at, payload").eq("student_id", studentId).eq("event_name", "practice_generated"),
    supabase.from("events").select("id, created_at, payload").eq("student_id", studentId).eq("event_name", "assessment_completed"),
  ]);

  if (conceptRes.error || masteryRes.error || practiceRes.error || assessmentRes.error || !conceptRes.data) {
    return null;
  }

  const practiceForConcept = (practiceRes.data ?? []).filter((row) => row.payload?.conceptId === conceptId);
  const assessmentForConcept = (assessmentRes.data ?? []).filter((row) => row.payload?.conceptId === conceptId);

  const rawMasteryScore = masteryRes.data ? Number(masteryRes.data.mastery_score) : undefined;
  const lastPracticedAt = masteryRes.data?.last_practiced_at ?? null;
  const commonMistakes = masteryRes.data?.common_mistakes ?? [];
  const attempts = masteryRes.data?.attempts ?? 0;
  const masteryScore = rawMasteryScore !== undefined ? Math.round(rawMasteryScore * 100) : 0;
  const retentionScore = rawMasteryScore !== undefined ? deriveRetention(rawMasteryScore, lastPracticedAt, now) : null;

  return {
    conceptName: conceptRes.data.name,
    status: statusFor(rawMasteryScore),
    masteryScore,
    retentionScore: retentionScore !== null ? Math.round(retentionScore * 100) : null,
    retentionStatus: retentionScore !== null ? classifyRetention(retentionScore) : null,
    attempts,
    lastPracticedAt,
    commonMistakes,
    reasoning: buildConceptReasoning(attempts, masteryScore, lastPracticedAt, commonMistakes, now),
    journey: buildConceptJourney(practiceForConcept, assessmentForConcept),
  };
}
