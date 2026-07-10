import type { PlanningContext } from "@/lib/agents/planning-context";
import type { LearningPlan } from "@/lib/agents/planning-agent";

/**
 * Personalization Agent's input contract: everything Planning Agent used
 * (PlanningContext), plus Planning's own output (LearningPlan) --
 * Personalization's spec explicitly reads "Planning Agent Output" as a
 * dependency, per 05_Agent_Architecture/06_Personalization_Agent.md.
 * Composed, not flattened, so provenance stays clear.
 */
export type PersonalizationContext = {
  planningContext: PlanningContext;
  plan: LearningPlan;
};
