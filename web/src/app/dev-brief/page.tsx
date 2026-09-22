import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLatestPublicEvalRun } from "@/lib/evaluation-analytics/get-public-eval-run";
import { summarizeEvalRun } from "@/lib/evaluation-analytics/summarize-eval-run";
import { Card } from "@/design-system/primitives/Card";
import { StatTile } from "@/design-system/primitives/StatTile";
import type { EvalRunItem } from "@/app/studio/evaluation/runs/EvalRunLiveView";
import styles from "./page.module.css";

/**
 * Dev Brief (learner UI redesign) -- "how MentorOS thinks, evaluates and
 * improves," for a technical reviewer/recruiter. Reuses the exact same
 * getLatestPublicEvalRun() /eval and /studio/evaluation/runs already
 * call -- one real, is_public eval run, PASS/FAIL/ERROR all shown, never
 * hidden. Visually separated at the bottom of the learner nav (Sidebar's
 * secondaryItems), since this is for reviewers, not the day-to-day
 * learning loop.
 */
export default async function DevBriefPage() {
  const supabase = await createClient();
  const run = await getLatestPublicEvalRun(supabase);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Dev Brief</h1>
      <p className={styles.subheading}>How MentorOS thinks, evaluates and improves.</p>

      <p className={styles.body}>
        Every teaching turn runs through a real multi-agent pipeline -- Safety, Router, Concept/Practice/Assessment,
        then an Evaluation Agent that grades the response on groundedness, accuracy, and safety before it&apos;s
        counted as a good turn. The results below are from a real, committed set of curriculum questions run through
        that exact pipeline -- not a demo script.
      </p>

      {!run ? (
        <Card className={styles.card}>
          <p className={styles.body}>No evaluation run available yet.</p>
        </Card>
      ) : (
        <Card className={styles.card}>
          <div className={styles.cardHeadRow}>
            <p className={styles.cardLabel}>Latest evaluation</p>
            <Link href="/dev-brief/results" className={styles.viewLink}>
              View Evaluation Results &rarr;
            </Link>
          </div>

          <EvalSummaryGrid items={run.items} />
        </Card>
      )}
    </div>
  );
}

function EvalSummaryGrid({ items }: { items: EvalRunItem[] }) {
  const summary = summarizeEvalRun(items);

  return (
    <div className={styles.statGrid}>
      <StatTile label="Overall score" value={summary.avgOverallScore ?? "—"} />
      <StatTile label="Passed" value={summary.passed} tone={summary.passed > 0 ? "success" : "neutral"} />
      <StatTile label="Flagged" value={summary.failed} tone={summary.failed > 0 ? "warning" : "neutral"} />
      <StatTile label="Errors" value={summary.errored} tone={summary.errored > 0 ? "danger" : "neutral"} />
      <StatTile label="Groundedness" value={summary.avgGroundedness ?? "—"} />
      <StatTile label="Accuracy" value={summary.avgAccuracy ?? "—"} />
      <StatTile label="Safety" value={summary.avgSafety ?? "—"} />
    </div>
  );
}
