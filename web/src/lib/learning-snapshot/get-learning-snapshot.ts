import type { createClient } from "@/lib/supabase/server";
import { buildLearningSnapshot, type LearningSnapshot } from "@/lib/learning-snapshot/learning-snapshot-aggregation";
import type { OverviewConcept } from "@/lib/learning-overview/learning-overview-aggregation";
import type { RetentionWeekBucket } from "@/lib/retention/retention-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type PracticeGeneratedPayload = { conceptId?: string };

/**
 * "First encountered" per concept -- the earliest real signal that a
 * concept was meaningfully touched. Two real timestamp sources exist:
 * learner_concept_mastery.created_at (set the first time an Assessment
 * turn produces a mastery row) and the earliest practice_generated event
 * for that concept (a student can practice before ever being assessed).
 * The earlier of the two is used. concept_explained events are
 * deliberately excluded -- they log no conceptId at all (see
 * concept-journey-aggregation.ts), so they can't be attributed here
 * either.
 */
async function getFirstEncounteredAt(supabase: SupabaseServerClient, studentId: string): Promise<Map<string, string>> {
  const [masteryRes, practiceRes] = await Promise.all([
    supabase.from("learner_concept_mastery").select("concept_id, created_at").eq("student_id", studentId),
    supabase.from("events").select("payload, created_at").eq("student_id", studentId).eq("event_name", "practice_generated"),
  ]);

  const firstEncounteredAt = new Map<string, string>();

  for (const row of masteryRes.data ?? []) {
    firstEncounteredAt.set(row.concept_id, row.created_at);
  }

  for (const row of practiceRes.data ?? []) {
    const conceptId = (row.payload as PracticeGeneratedPayload).conceptId;
    if (!conceptId) continue;
    const existing = firstEncounteredAt.get(conceptId);
    if (!existing || row.created_at < existing) {
      firstEncounteredAt.set(conceptId, row.created_at);
    }
  }

  return firstEncounteredAt;
}

/**
 * `retentionTrend` and `reviewNowCount` are passed in rather than
 * re-derived here -- the Retention section needs the same weekly buckets
 * for its own chart, and Needs Revision must be the exact same count the
 * Revision Queue's "reviewNow" tier already computed (see
 * learning-snapshot-aggregation.ts's doc comment), not a second,
 * independently-derived number. The page fetches both once and shares
 * them.
 */
export async function getLearningSnapshot(
  supabase: SupabaseServerClient,
  studentId: string,
  concepts: OverviewConcept[],
  retentionTrend: RetentionWeekBucket[],
  reviewNowCount: number,
  now: Date = new Date(),
): Promise<LearningSnapshot> {
  const firstEncounteredAt = await getFirstEncounteredAt(supabase, studentId);
  return buildLearningSnapshot(concepts, firstEncounteredAt, retentionTrend, reviewNowCount, now);
}
