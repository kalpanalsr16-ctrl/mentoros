import { createClient } from "@/lib/supabase/server";
import { listLinksForParent } from "@/lib/parent-links/list-links-for-parent";
import { Card } from "@/design-system/primitives/Card";
import { Badge } from "@/design-system/primitives/Badge";
import { RevokeLinkButton } from "@/components/parent-links/RevokeLinkButton";
import { LinkChildForm } from "./LinkChildForm";
import styles from "./page.module.css";

const STATUS_BADGE = {
  pending: { variant: "warning" as const, label: "Pending your child's approval" },
  verified: { variant: "success" as const, label: "Verified" },
  rejected: { variant: "neutral" as const, label: "Rejected" },
  expired: { variant: "neutral" as const, label: "Expired" },
  revoked: { variant: "neutral" as const, label: "Revoked" },
};

/**
 * `/parent/children` -- the parent side of the approved Parent
 * Verification & Consent flow: request a new link, and see the status
 * of every link this parent account has ever requested. Distinct from
 * `/parent` itself (the Weekly Summary, H3), which stays blocked until
 * a verified link actually exists to summarize.
 */
export default async function ParentChildrenPage() {
  // /parent/layout.tsx already redirects any non-parent role away, so no
  // separate role check is needed here (same convention as every other
  // role-shell page, e.g. /app/*).
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const parentId = claimsData!.claims!.sub as string;

  const links = await listLinksForParent(supabase, parentId);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Linked children</h1>

      <Card className={styles.formCard}>
        <h2 className={styles.sectionHeading}>Link a child</h2>
        <LinkChildForm />
      </Card>

      {links.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Your requests</h2>
          <div className={styles.list}>
            {links.map((link) => {
              const badge = STATUS_BADGE[link.status];
              return (
                <Card key={link.linkId} className={styles.row}>
                  <div className={styles.rowHead}>
                    <p className={styles.studentId}>Student {link.studentId.slice(0, 8)}…</p>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  {link.status === "verified" && <RevokeLinkButton linkId={link.linkId} role="parent" />}
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
