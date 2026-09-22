import type { ConfusionItem } from "@/lib/misconceptions/student-confusion-aggregation";

/**
 * "Patterns MentorOS noticed" (My Learning enhancement) -- a re-skin of
 * the existing, already-tested repeated-confusion data (see
 * student-confusion-aggregation.ts for the exact-text-match rationale),
 * framed as a useful insight rather than a judgment, plus a real
 * prerequisite pointer when the curriculum's own concept_relationships
 * graph has one.
 *
 * This deliberately does NOT include a second "you learn better after
 * worked examples" style insight. That would require correlating a
 * turn's teaching strategy (learning_plan_created's `strategy` field)
 * with its later outcome (assessment_completed's `masteryScore`) for the
 * same concept -- but neither `learning_plan_created` nor
 * `concept_explained` events log a conceptId anywhere in this codebase
 * (confirmed by reading route.ts's logEvent calls), so there is no real
 * join key to attribute a strategy to a concept's later result. Building
 * that correlation anyway (e.g. by guessing from conversation ordering)
 * would be exactly the "unreliable inference" this feature is
 * instructed not to ship. Adding it later would need a small,
 * additive change to what those two events log -- out of scope for a
 * My-Learning-only change.
 */
export type RepeatedChallenge = {
  text: string;
  frequency: number;
  conceptNames: string[];
  prerequisiteConceptName: string | null;
};

export function buildRepeatedChallenges(
  confusionItems: ConfusionItem[],
  prerequisiteByConceptId: Map<string, string>,
): RepeatedChallenge[] {
  return confusionItems.map((item) => {
    const prerequisiteConceptName = item.conceptIds
      .map((id) => prerequisiteByConceptId.get(id))
      .find((name): name is string => name !== undefined);

    return {
      text: item.text,
      frequency: item.frequency,
      conceptNames: item.conceptNames,
      prerequisiteConceptName: prerequisiteConceptName ?? null,
    };
  });
}
