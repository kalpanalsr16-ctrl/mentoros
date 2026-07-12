import type { createClient } from "@/lib/supabase/server";
import type { LearnerStateProvider } from "@/lib/learner/learner-state-provider";
import type { LearnerState } from "@/lib/learner/learner-state";
import { HIGH_MASTERY_THRESHOLD } from "@/lib/agents/planning-agent";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Below this mastery score, a concept counts as "weak" for
 * LearnerState.weakConceptIds -- named, not inlined, so it can be tuned
 * independently of HIGH_MASTERY_THRESHOLD (Planning Agent's own constant,
 * reused here for "strong" rather than redefined, so this codebase has
 * one definition of "high mastery," not two that could drift apart).
 */
export const LOW_MASTERY_THRESHOLD = 0.4;

/**
 * M8's real LearnerStateProvider implementation, replacing
 * unknownLearnerStateProvider now that Memory Agent (lib/agents/
 * memory-agent.ts) exists to have actually written something here.
 *
 * weakConceptIds/strongConceptIds are derived from learner_concept_
 * mastery.mastery_score at read time, never stored as separate columns --
 * see the migration's comment for why (avoids the two ever drifting out
 * of sync with the scores that justify them).
 *
 * isKnown is true the moment either a learner_profiles row or any
 * learner_concept_mastery row exists -- a learner becomes "known" as
 * soon as there's any real evidence about them, not only once every
 * field is populated.
 */
export function createPostgresLearnerStateProvider(
  supabase: SupabaseServerClient,
): LearnerStateProvider {
  return {
    async getLearnerState(studentId) {
      const { data: profile } = await supabase
        .from("learner_profiles")
        .select("grade, confidence, preferred_learning_style, learning_goals")
        .eq("id", studentId)
        .maybeSingle();

      const { data: masteryRows } = await supabase
        .from("learner_concept_mastery")
        .select("concept_id, mastery_score")
        .eq("student_id", studentId);

      const rows = masteryRows ?? [];

      if (!profile && rows.length === 0) {
        return { isKnown: false };
      }

      const masteryByConcept = Object.fromEntries(
        rows.map((r) => [r.concept_id, Number(r.mastery_score)]),
      );
      const weakConceptIds = rows
        .filter((r) => Number(r.mastery_score) < LOW_MASTERY_THRESHOLD)
        .map((r) => r.concept_id);
      const strongConceptIds = rows
        .filter((r) => Number(r.mastery_score) >= HIGH_MASTERY_THRESHOLD)
        .map((r) => r.concept_id);

      return {
        isKnown: true,
        grade: profile?.grade ?? undefined,
        masteryByConcept,
        weakConceptIds,
        strongConceptIds,
        confidence: (profile?.confidence as LearnerState["confidence"]) ?? undefined,
        learningGoals: profile?.learning_goals ?? undefined,
        preferredLearningStyle: profile?.preferred_learning_style as LearnerState["preferredLearningStyle"],
      };
    },
  };
}
