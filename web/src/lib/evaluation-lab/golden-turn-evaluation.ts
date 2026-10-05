import {
  runEvaluation,
  type EvaluationCompletedPayload,
  type EvaluationDeps,
  type EvaluationRequest,
} from "@/lib/evaluation/run-evaluation";
import type { logEvent } from "@/lib/observability/trace";

type EvaluationDb = Parameters<typeof logEvent>[0];

/**
 * What the golden benchmark gets from one generated turn. Kept apart so a
 * missing Evaluation, an Evaluation that failed, and a low judge score are
 * never confused with each other.
 */
export type GoldenTurnEvaluation =
  | { kind: "not_evaluated" }
  | { kind: "evaluation_error"; reason: string }
  | { kind: "evaluated"; payload: EvaluationCompletedPayload };

/**
 * Invokes the shared Evaluation capability explicitly, with the request the
 * pipeline produced for this turn, and waits for its result.
 */
export async function evaluateGoldenTurn(
  supabase: EvaluationDb,
  request: EvaluationRequest | undefined,
  deps?: EvaluationDeps,
): Promise<GoldenTurnEvaluation> {
  if (!request) return { kind: "not_evaluated" };
  const outcome = await runEvaluation(supabase, request, deps);
  if (outcome.kind === "failed") return { kind: "evaluation_error", reason: outcome.reason };
  return { kind: "evaluated", payload: outcome.payload };
}
