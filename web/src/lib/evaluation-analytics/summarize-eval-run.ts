import type { EvalRunItem } from "@/app/studio/evaluation/runs/EvalRunLiveView";

/**
 * Dev Brief's "Latest Evaluation" summary card (learner UI redesign) --
 * pure aggregation over the same eval_run_items EvalRunLiveView already
 * renders in full, just rolled up into counts/averages for a compact
 * landing view. Only "finished" items (pass/fail) count toward the
 * dimension averages, matching EvalRunLiveView's own convention --
 * errors have no scores to average.
 */
export type EvalRunSummary = {
  total: number;
  passed: number;
  failed: number;
  errored: number;
  avgOverallScore: number | null;
  avgGroundedness: number | null;
  avgAccuracy: number | null;
  avgSafety: number | null;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export function summarizeEvalRun(items: EvalRunItem[]): EvalRunSummary {
  const finished = items.filter((item) => item.status === "pass" || item.status === "fail");

  return {
    total: items.length,
    passed: items.filter((item) => item.status === "pass").length,
    failed: items.filter((item) => item.status === "fail").length,
    errored: items.filter((item) => item.status === "error").length,
    avgOverallScore: average(finished.filter((i) => i.overall_score !== null).map((i) => i.overall_score!)),
    avgGroundedness: average(finished.filter((i) => i.groundedness_score !== null).map((i) => i.groundedness_score!)),
    avgAccuracy: average(finished.filter((i) => i.accuracy_score !== null).map((i) => i.accuracy_score!)),
    avgSafety: average(finished.filter((i) => i.safety_score !== null).map((i) => i.safety_score!)),
  };
}
