import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listVerifiedChildren } from "@/lib/parent-links/list-verified-children";
import { getAssessmentHistoryData } from "@/lib/assessment-history/get-assessment-history";
import { buildWeeklySummary } from "@/lib/parent-portal/weekly-summary";
import { Card } from "@/design-system/primitives/Card";
import styles from "./page.module.css";

/**
 * `/parent` -- H3 Sprint 4, the last of H3: the Weekly Summary itself.
 * "The single most important artifact this portal produces" per
 * 04_Parent_Portal.md -- one Card per verified child, 3-4 short
 * plain-language bullets, not the full Progress/Strengths/Revision
 * detail (that's what /parent/children/:studentId is for). Computed
 * on-demand at request time, same as every other page in this app --
 * see weekly-summary.ts for why a scheduled job isn't used.
 */
export default async function ParentDashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const parentId = claimsData!.claims!.sub as string;

  const children = await listVerifiedChildren(supabase, parentId);

  const summaries = await Promise.all(
    children.map(async (child) => {
      const history = await getAssessmentHistoryData(supabase, child.studentId);
      return { child, bullets: buildWeeklySummary(history?.items ?? []) };
    }),
  );

  return (
    <div className={styles.page}>
      {children.length === 0 ? (
        <p className={styles.body}>Link a child&apos;s account to see their weekly summary here.</p>
      ) : (
        <section className={styles.section}>
          <h1 className={styles.sectionHeading}>Weekly summary</h1>
          <div className={styles.list}>
            {summaries.map(({ child, bullets }) => (
              <Card key={child.studentId} className={styles.summaryCard}>
                <Link href={`/parent/children/${child.studentId}`} className={styles.childLink}>
                  {child.displayName} →
                </Link>
                <ul className={styles.bulletList}>
                  {bullets.map((bullet, i) => (
                    <li key={i} className={styles.bulletItem}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Link href="/parent/children" className={styles.childrenLink}>
        Link a child →
      </Link>
    </div>
  );
}
