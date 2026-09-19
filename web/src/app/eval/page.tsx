import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EvalRunLiveView, type EvalRunItem } from "../studio/evaluation/runs/EvalRunLiveView";
import styles from "./page.module.css";

/**
 * `/eval` -- the recruiter-facing evaluation showcase. No sign-in
 * required: readable only because eval_runs/eval_run_items rows the
 * harness writes are explicitly marked `is_public = true`
 * (0024_eval_runs.sql) -- deliberate, narrow public exposure of
 * synthetic golden-question results only, never real student data. Uses
 * the plain anon-key server client (not the service-role client) so this
 * page reads under the exact same RLS a random visitor's browser would.
 */
export default async function PublicEvalPage() {
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("eval_runs")
    .select("id, label, status, started_at, completed_at")
    .eq("is_public", true)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const items = run
    ? (
        await supabase
          .from("eval_run_items")
          .select(
            "id, golden_id, question, source_agent, status, latency_ms, overall_score, groundedness_score, accuracy_score, safety_score, hallucination_risk, response_excerpt, error_message",
          )
          .eq("run_id", run.id)
          .order("created_at", { ascending: true })
      ).data
    : null;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>MentorOS</p>
        <h1 className={styles.heading}>Live evaluation results</h1>
        <p className={styles.subheading}>
          A committed set of real curriculum questions, sent through MentorOS&apos;s actual Safety &rarr; Router &rarr;
          Concept/Practice/Assessment &rarr; Evaluation Agent pipeline -- the same one every real student turn runs
          through. Every score below (groundedness, accuracy, safety, latency) comes from a real Claude call, not a
          canned demo value.
        </p>
        <Link href="/demo" className={styles.tryLink}>
          Try the chatbot &rarr;
        </Link>
      </header>

      {!run ? (
        <p className={styles.body}>No public evaluation run yet.</p>
      ) : (
        <EvalRunLiveView
          runId={run.id}
          initialLabel={run.label}
          initialStatus={run.status}
          initialItems={(items ?? []) as EvalRunItem[]}
        />
      )}
    </div>
  );
}
