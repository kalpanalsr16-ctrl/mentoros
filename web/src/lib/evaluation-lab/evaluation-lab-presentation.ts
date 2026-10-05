import type { RoutingResult } from "@/lib/evaluation-lab/evaluation-lab-aggregation";
import { gateOutcome } from "@/lib/evaluation-lab/evaluation-lab-aggregation";

/**
 * The one recruiter-facing vocabulary for an evaluation outcome. Stored values
 * (pass, fail, error, pending) are never shown as-is.
 */
export type OutcomeLabel = "Passed" | "Failed" | "Errored" | "Not run";

export type RunStatusLabel = "Completed" | "In progress" | "Unknown";

const ROUTING_OUTCOME_LABEL: Record<RoutingResult, OutcomeLabel> = {
  pass: "Passed",
  fail: "Failed",
  errored: "Errored",
  not_run: "Not run",
};

const GATE_OUTCOME_LABEL: Record<ReturnType<typeof gateOutcome>, OutcomeLabel> = {
  pass: "Passed",
  fail: "Failed",
  errored: "Errored",
  not_run: "Not run",
};

export function routingOutcomeLabel(routing: RoutingResult): OutcomeLabel {
  return ROUTING_OUTCOME_LABEL[routing];
}

/** Quality result for one case, from its stored status. */
export function qualityOutcomeLabel(storedStatus: string): OutcomeLabel {
  return GATE_OUTCOME_LABEL[gateOutcome(storedStatus)];
}

/** Run-level state, not an evaluation outcome. */
export function runStatusLabel(storedStatus: string): RunStatusLabel {
  if (storedStatus === "completed") return "Completed";
  if (storedStatus === "running" || storedStatus === "pending") return "In progress";
  return "Unknown";
}

/** Fixed UTC rendering, so a timestamp reads the same wherever the server runs. */
export function formatUtc(iso: string): string {
  const formatted = new Date(iso).toLocaleString("en-US", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `${formatted} UTC`;
}
