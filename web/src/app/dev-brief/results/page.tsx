import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLatestPublicEvalRun } from "@/lib/evaluation-analytics/get-public-eval-run";
import { EvalRunLiveView } from "@/app/studio/evaluation/runs/EvalRunLiveView";
import styles from "./page.module.css";

/**
 * Full per-scenario detail -- literally the same live-updating component
 * /eval (public) and /studio/evaluation/runs (teacher) already render,
 * reused here for the authenticated, nav-integrated learner view. One
 * shared data source (getLatestPublicEvalRun) and one shared component,
 * not a third fork of either. No trace-id link: golden-eval-harness
 * traces belong to the harness's own service account, not this student's
 * session, and events' self-read RLS means a link here would just 404 --
 * see the redesign plan's Dev Brief section for why that's a deliberate
 * omission, not an oversight.
 */
export default async function DevBriefResultsPage() {
  const supabase = await createClient();
  const run = await getLatestPublicEvalRun(supabase);

  return (
    <div className={styles.page}>
      <div className={styles.headRow}>
        <h1 className={styles.heading}>Evaluation Results</h1>
        <Link href="/dev-brief" className={styles.backLink}>
          &larr; Dev Brief
        </Link>
      </div>

      {!run ? (
        <p className={styles.body}>No evaluation run available yet.</p>
      ) : (
        <EvalRunLiveView runId={run.id} initialLabel={run.label} initialStatus={run.status} initialItems={run.items} />
      )}
    </div>
  );
}
