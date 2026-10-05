import type { createClient } from "@/lib/supabase/server";
import {
  buildLabCases,
  summarizeLab,
  type LabCase,
  type LabItemRow,
  type LabRunRow,
  type LabSummary,
} from "@/lib/evaluation-lab/evaluation-lab-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type EvaluationLabData = {
  runs: LabRunRow[];
  selectedRun: LabRunRow | null;
  cases: LabCase[];
  summary: LabSummary | null;
};

const ITEM_COLUMNS =
  "golden_id, question, status, source_agent, overall_score, groundedness_score, accuracy_score, safety_score, hallucination_risk, latency_ms, response_excerpt, error_message, trace_id";

/**
 * Reads runs and items through the caller's RLS-scoped session, so the
 * showcase account sees runs under 0031's policy. Returns null if the run
 * list can't be read (for example, before migration 0030 is applied).
 */
export async function getEvaluationLab(
  supabase: SupabaseServerClient,
  requestedRunId: string | null,
): Promise<EvaluationLabData | null> {
  const { data: runRows, error: runsError } = await supabase
    .from("eval_runs")
    .select("id, label, status, is_public, started_at, version_label, model")
    .order("started_at", { ascending: false })
    .limit(20);
  if (runsError) return null;

  const runs: LabRunRow[] = (runRows ?? []).map((r) => ({
    id: r.id,
    label: r.label,
    status: r.status,
    isPublic: r.is_public,
    startedAt: r.started_at,
    versionLabel: r.version_label ?? null,
    model: r.model ?? null,
  }));

  const selectedRun = runs.find((r) => r.id === requestedRunId) ?? runs[0] ?? null;
  if (!selectedRun) return { runs, selectedRun: null, cases: [], summary: null };

  const { data: itemRows, error: itemsError } = await supabase
    .from("eval_run_items")
    .select(ITEM_COLUMNS)
    .eq("run_id", selectedRun.id)
    .order("created_at", { ascending: true });
  if (itemsError) return null;

  const items: LabItemRow[] = (itemRows ?? []).map((i) => ({
    goldenId: i.golden_id,
    question: i.question,
    status: i.status,
    sourceAgent: i.source_agent,
    overallScore: i.overall_score === null ? null : Number(i.overall_score),
    groundednessScore: i.groundedness_score === null ? null : Number(i.groundedness_score),
    accuracyScore: i.accuracy_score === null ? null : Number(i.accuracy_score),
    safetyScore: i.safety_score === null ? null : Number(i.safety_score),
    hallucinationRisk: i.hallucination_risk,
    latencyMs: i.latency_ms,
    responseExcerpt: i.response_excerpt,
    errorMessage: i.error_message,
    traceId: i.trace_id,
  }));

  const cases = buildLabCases(items);
  return { runs, selectedRun, cases, summary: summarizeLab(cases) };
}
