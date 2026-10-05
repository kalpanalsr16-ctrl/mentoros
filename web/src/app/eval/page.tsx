import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkShowcaseAccess } from "@/lib/showcase/showcase-access";
import { EvalRunLiveView } from "../studio/evaluation/runs/EvalRunLiveView";
import { getLatestPublicEvalRun } from "@/lib/evaluation-analytics/get-public-eval-run";
import styles from "./page.module.css";

/**
 * `/eval` -- evaluation internals, so it is part of the AI showcase and gated
 * by ai_showcase_access (docs/AI_SHOWCASE_ARCHITECTURE.md). Signed-out visitors
 * go to sign-in; signed-in accounts without the capability get a 404. Reads
 * the golden-question runs through the caller's own session, so the RLS
 * policy in 0029_showcase_eval_access.sql is the second gate.
 */
export default async function PublicEvalPage() {
  const supabase = await createClient();
  const state = await checkShowcaseAccess(supabase);
  if (state === "unauthenticated") redirect("/sign-in");
  if (state === "forbidden") notFound();

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
