import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listVerifiedChildren } from "@/lib/parent-links/list-verified-children";
import { PlaceholderPage } from "@/design-system/layouts/PlaceholderPage";
import styles from "./page.module.css";

/**
 * `/parent/children/:studentId` -- H3 Sprint 1 wires up the route and
 * its access guard only; Progress/Strengths-Weaknesses/Recommendations/
 * Revision/Achievements (Sprints 2-3) fill this in. The guard itself is
 * real now, not deferred: only a student this parent has a *verified*
 * link to is ever named back to them -- same "doesn't exist" and "not
 * yours" collapse into one response used throughout this codebase
 * (get-student-overview.ts et al.), so a parent can't use this route to
 * probe whether an arbitrary id is a real, linked, or unlinked account.
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

  return (
    <div className={styles.page}>
      <Link href="/parent" className={styles.backLink}>
        ← Back to your children
      </Link>
      <PlaceholderPage
        title={child.displayName}
        description="Progress, strengths, recommendations, revision status, and achievements will live here."
      />
    </div>
  );
}
