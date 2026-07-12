import type { createClient } from "@/lib/supabase/server";
import type { LearnerProfileWriter } from "@/lib/learner/learner-profile-writer";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * M8's real LearnerProfileWriter implementation -- the only code path in
 * this codebase that writes to learner_concept_mastery/learner_profiles,
 * per 12_Memory_Agent.md's "Memory Agent is the ONLY component
 * responsible for updating the learner profile."
 *
 * Merge strategy for mastery_score: a running average weighted by prior
 * attempt count (`(previousMastery * previousAttempts + newEvidence) /
 * newAttempts`), not a blind overwrite -- per the spec's Update Strategy
 * ("merge new evidence, preserve historical trends, track improvement
 * over time"). This is a deliberately simple first merge function, not a
 * recency-weighted or spaced-repetition-aware one; revisit once real
 * usage data exists to justify something more sophisticated (the spec's
 * own Revision Planner section flags spaced repetition as a future
 * enhancement, same spirit applies here).
 */
export function createPostgresLearnerProfileWriter(
  supabase: SupabaseServerClient,
): LearnerProfileWriter {
  return {
    async applyEvidence(evidence) {
      const { data: existing } = await supabase
        .from("learner_concept_mastery")
        .select("mastery_score, attempts, common_mistakes")
        .eq("student_id", evidence.studentId)
        .eq("concept_id", evidence.conceptId)
        .maybeSingle();

      const previousAttempts = existing?.attempts ?? 0;
      const previousMastery = existing ? Number(existing.mastery_score) : 0;
      const newAttempts = previousAttempts + 1;
      const newMastery = existing
        ? (previousMastery * previousAttempts + evidence.masteryScore) / newAttempts
        : evidence.masteryScore;

      const existingMistakes: string[] = existing?.common_mistakes ?? [];
      const newMistakes = (evidence.commonMistakes ?? []).filter(
        (mistake) => !existingMistakes.includes(mistake),
      );

      await supabase.from("learner_concept_mastery").upsert({
        student_id: evidence.studentId,
        concept_id: evidence.conceptId,
        mastery_score: newMastery,
        attempts: newAttempts,
        last_practiced_at: new Date().toISOString(),
        common_mistakes: [...existingMistakes, ...newMistakes],
        updated_at: new Date().toISOString(),
      });

      if (evidence.confidence) {
        // Upsert only touches the columns in this payload -- grade,
        // preferred_learning_style, and learning_goals on an existing row
        // are untouched, per the same "merge, don't overwrite" principle.
        await supabase.from("learner_profiles").upsert({
          id: evidence.studentId,
          confidence: evidence.confidence,
          updated_at: new Date().toISOString(),
        });
      }
    },
  };
}
