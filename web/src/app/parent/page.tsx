import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listVerifiedChildren } from "@/lib/parent-links/list-verified-children";
import { PlaceholderPage } from "@/design-system/layouts/PlaceholderPage";
import { Card } from "@/design-system/primitives/Card";
import styles from "./page.module.css";

/**
 * The Weekly Summary itself (H3 Sprint 4) still stays a placeholder
 * until that aggregation exists. This sprint adds the child selector --
 * every verified link now navigates to /parent/children/:studentId,
 * which 0017_parent_verified_read.sql just made actually readable.
 */
export default async function ParentDashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const parentId = claimsData!.claims!.sub as string;

  const children = await listVerifiedChildren(supabase, parentId);

  return (
    <div className={styles.page}>
      {children.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Your children</h2>
          <div className={styles.list}>
            {children.map((child) => (
              <Card key={child.studentId} className={styles.row}>
                <Link href={`/parent/children/${child.studentId}`} className={styles.childLink}>
                  {child.displayName} →
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      <PlaceholderPage
        title="Weekly summary"
        description="A plain-language digest of your child's learning will live here, once you're linked to a child's account."
      />
      <Link href="/parent/children" className={styles.childrenLink}>
        Link a child →
      </Link>
    </div>
  );
}
