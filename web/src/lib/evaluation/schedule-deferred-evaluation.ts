import { after } from "next/server";
import { runEvaluation, type EvaluationDeps, type EvaluationRequest } from "@/lib/evaluation/run-evaluation";
import type { logEvent } from "@/lib/observability/trace";

type EvaluationDb = Parameters<typeof logEvent>[0];

type Scheduler = (task: () => Promise<unknown>) => void;

/**
 * Production scheduling for Evaluation: runs only after the learner's reply
 * has been saved and sent, via Next's after(). Never awaited on the reply path.
 */
export function scheduleDeferredEvaluation(
  supabase: EvaluationDb,
  request: EvaluationRequest,
  options: { schedule?: Scheduler; deps?: EvaluationDeps } = {},
): void {
  const schedule: Scheduler = options.schedule ?? after;
  schedule(() => runEvaluation(supabase, request, options.deps));
}
