import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/design-system/primitives/Card";
import { EvalRunLiveView, type EvalRunItem } from "./EvalRunLiveView";
import styles from "./page.module.css";

/**
 * `/studio/evaluation/runs` -- the golden-set regression view named as
 * the top gap in docs/evaluation-strategy-report.md Section 7 ("no
 * committed golden dataset, no regression harness"). Triggered outside
 * the UI on purpose (`npm run eval:golden`, per the approved decision to
 * avoid a serverless-timeout-prone "Run" button paying for 11+ real
 * Claude calls on every click) -- this page just watches whatever run is
 * most recent, live, via Supabase Realtime.
 */
export default async function EvalRunsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const teacherId = claimsData!.claims!.sub as string;

  const { data: run } = await supabase
    .from("eval_runs")
    .select("id, label, status, started_at, completed_at")
    .eq("teacher_id", teacherId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!run) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Golden eval runs</h1>
        <Card className={styles.emptyCard}>
          <p className={styles.body}>
            No eval runs yet. From the repo, run <code className={styles.code}>npm run eval:golden</code> to send the
            committed golden question set through the live pipeline -- results appear here as they land.
          </p>
        </Card>
      </div>
    );
  }

  const { data: items } = await supabase
    .from("eval_run_items")
    .select(
      "id, golden_id, question, source_agent, status, latency_ms, overall_score, groundedness_score, accuracy_score, safety_score, hallucination_risk, response_excerpt, error_message",
    )
    .eq("run_id", run.id)
    .order("created_at", { ascending: true });

  return (
    <div className={styles.page}>
      <div className={styles.headRow}>
        <h1 className={styles.heading}>Golden eval runs</h1>
        <Link href="/studio/evaluation" className={styles.backLink}>
          &larr; Evaluation dashboard
        </Link>
      </div>

      <EvalRunLiveView
        runId={run.id}
        initialLabel={run.label}
        initialStatus={run.status}
        initialItems={(items ?? []) as EvalRunItem[]}
      />
    </div>
  );
}
