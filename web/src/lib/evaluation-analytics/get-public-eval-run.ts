import type { createClient } from "@/lib/supabase/server";
import type { EvalRunItem } from "@/app/studio/evaluation/runs/EvalRunLiveView";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type PublicEvalRun = {
  id: string;
  label: string;
  status: string;
  items: EvalRunItem[];
};

const ITEM_COLUMNS =
  "id, golden_id, question, source_agent, status, latency_ms, overall_score, groundedness_score, accuracy_score, safety_score, hallucination_risk, response_excerpt, error_message";

/**
 * Shared by `/` and `/eval` (both public, no-auth pages) so the "which
 * run counts as the current public showcase" query lives in one place.
 * Relies entirely on the `is_public = true` RLS policy
 * (0024_eval_runs.sql) -- this runs with the plain anon-key server
 * client, same as any anonymous visitor's browser would.
 */
export async function getLatestPublicEvalRun(supabase: SupabaseServerClient): Promise<PublicEvalRun | null> {
  const { data: run } = await supabase
    .from("eval_runs")
    .select("id, label, status")
    .eq("is_public", true)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!run) return null;

  const { data: items } = await supabase
    .from("eval_run_items")
    .select(ITEM_COLUMNS)
    .eq("run_id", run.id)
    .order("created_at", { ascending: true });

  return { id: run.id, label: run.label, status: run.status, items: (items ?? []) as EvalRunItem[] };
}
