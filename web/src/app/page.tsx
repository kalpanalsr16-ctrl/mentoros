import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EvalRunLiveView } from "@/app/studio/evaluation/runs/EvalRunLiveView";
import { getLatestPublicEvalRun } from "@/lib/evaluation-analytics/get-public-eval-run";
import styles from "./page.module.css";

/**
 * `/` -- the actual front door (previously a placeholder "Coming soon"
 * page). Public, no sign-in required: the evaluation section below is
 * readable only because those specific rows are marked `is_public = true`
 * (0024_eval_runs.sql), the same mechanism /eval uses -- this page and
 * /eval intentionally show the same live run, just framed as a landing
 * page here instead of a standalone showcase.
 */
export default async function Home() {
  const supabase = await createClient();
  const run = await getLatestPublicEvalRun(supabase);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>MentorOS</p>
        <h1 className={styles.heading}>An AI tutor that shows its work.</h1>
        <p className={styles.subheading}>
          A real teaching pipeline -- Safety, Router, Concept/Practice/Assessment, and an Evaluation Agent that grades
          every single reply on groundedness, accuracy, and safety before it ever reaches a student. Try it yourself,
          or scroll down to watch the evaluation results below, live.
        </p>
        <div className={styles.ctaRow}>
          <Link href="/demo" className={styles.primaryLink}>
            Try the chatbot &rarr;
          </Link>
          <Link href="/sign-in" className={styles.secondaryLink}>
            Sign in
          </Link>
          <Link href="/sign-up" className={styles.secondaryLink}>
            Sign up
          </Link>
        </div>
      </header>

      <section className={styles.evalSection}>
        <h2 className={styles.evalHeading}>Live evaluation results</h2>
        <p className={styles.evalIntro}>
          A committed set of real curriculum questions, sent through the pipeline above end to end. Every score here
          (groundedness, accuracy, safety, latency) comes from a real Claude call, not a canned demo value.
        </p>

        {!run ? (
          <p className={styles.body}>No public evaluation run yet.</p>
        ) : (
          <EvalRunLiveView runId={run.id} initialLabel={run.label} initialStatus={run.status} initialItems={run.items} />
        )}
      </section>
    </div>
  );
}
