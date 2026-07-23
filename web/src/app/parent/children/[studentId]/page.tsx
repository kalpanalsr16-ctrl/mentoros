import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listVerifiedChildren } from "@/lib/parent-links/list-verified-children";
import { getProgressData } from "@/lib/progress/get-progress-data";
import { summarizeChildProgress } from "@/lib/parent-portal/child-progress-summary";
import { Card } from "@/design-system/primitives/Card";
import { Badge } from "@/design-system/primitives/Badge";
import { ProgressRing } from "@/design-system/primitives/ProgressRing";
import styles from "./page.module.css";

/**
 * `/parent/children/:studentId` -- H3 Sprint 2 adds Progress and
 * Strengths/Weaknesses. Recommendations/Revision/Achievements are
 * Sprint 3. getProgressData() is reused as-is, unmodified -- the exact
 * same student-facing reader /app/progress calls -- since RLS
 * (0017_parent_verified_read.sql) is what scopes it to this parent's
 * verified child, not an app-level parameter. The access guard below
 * (matching a non-child id) is a defense-in-depth belt to RLS's braces,
 * not a substitute for it.
 */
export default async function ChildDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const parentId = claimsData!.claims!.sub as string;

  const children = await listVerifiedChildren(supabase, parentId);
  const child = children.find((c) => c.studentId === studentId);

  if (!child) {
    return (
      <div className={styles.page}>
        <p className={styles.body}>That&apos;s not one of your linked children.</p>
        <Link href="/parent" className={styles.backLink}>
          Back to your children
        </Link>
      </div>
    );
  }

  const progressData = await getProgressData(supabase, studentId);
  const summary = progressData?.hasActivity ? summarizeChildProgress(progressData.chapters) : null;

  return (
    <div className={styles.page}>
      <Link href="/parent" className={styles.backLink}>
        ← Back to your children
      </Link>
      <h1 className={styles.heading}>{child.displayName}</h1>

      {!summary && (
        <p className={styles.body}>
          {child.displayName} hasn&apos;t started practicing yet -- progress will show up here once they do.
        </p>
      )}

      {summary && (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>Progress</h2>
            <Card className={styles.progressCard}>
              <div className={styles.conceptGrid}>
                {summary.headlineConcepts.map((concept) => (
                  <div key={concept.conceptId} className={styles.conceptItem}>
                    <ProgressRing value={Math.round(concept.masteryScore * 100)} size={56} />
                    <p className={styles.conceptName}>{concept.conceptName}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {(summary.weakConcepts.length > 0 || summary.strongConcepts.length > 0) && (
            <section className={styles.section}>
              <h2 className={styles.sectionHeading}>Strengths &amp; weaknesses</h2>
              <div className={styles.strengthGrid}>
                {summary.weakConcepts.length > 0 && (
                  <Card className={styles.strengthCard}>
                    <p className={styles.strengthLabel}>Needs practice</p>
                    <ul className={styles.strengthList}>
                      {summary.weakConcepts.map((c) => (
                        <li key={c.conceptId} className={styles.strengthItem}>
                          <Badge variant="warning">{c.conceptName}</Badge>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
                {summary.strongConcepts.length > 0 && (
                  <Card className={styles.strengthCard}>
                    <p className={styles.strengthLabel}>Doing well</p>
                    <ul className={styles.strengthList}>
                      {summary.strongConcepts.map((c) => (
                        <li key={c.conceptId} className={styles.strengthItem}>
                          <Badge variant="success">{c.conceptName}</Badge>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
