import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EvalRunLiveView } from "../studio/evaluation/runs/EvalRunLiveView";
import { getLatestPublicEvalRun } from "@/lib/evaluation-analytics/get-public-eval-run";
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
  const run = await getLatestPublicEvalRun(supabase);

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
        <EvalRunLiveView runId={run.id} initialLabel={run.label} initialStatus={run.status} initialItems={run.items} />
      )}
    </div>
  );
}
