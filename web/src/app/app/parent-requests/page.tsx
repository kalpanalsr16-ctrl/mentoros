import { createClient } from "@/lib/supabase/server";
import { listLinksForStudent } from "@/lib/parent-links/list-links-for-student";
import { Card } from "@/design-system/primitives/Card";
import { Badge } from "@/design-system/primitives/Badge";
import { RevokeLinkButton } from "@/components/parent-links/RevokeLinkButton";
import { ParentRequestActions } from "./ParentRequestActions";
import styles from "./page.module.css";

const HISTORY_BADGE = {
  rejected: { variant: "neutral" as const, label: "Rejected" },
  expired: { variant: "neutral" as const, label: "Expired" },
  revoked: { variant: "neutral" as const, label: "Revoked" },
};

/**
 * `/app/parent-requests` -- the student side of the approved Parent
 * Verification & Consent flow: pending requests to act on, currently
 * linked parents (revocable any time), and a plain history of past
 * outcomes. One universal flow for every account, no grade-gating, per
 * the approved design's adjustment #1.
 */
export default async function ParentRequestsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const studentId = claimsData!.claims!.sub as string;

  const links = await listLinksForStudent(supabase, studentId);
  const pending = links.filter((l) => l.status === "pending");
  const verified = links.filter((l) => l.status === "verified");
  const history = links.filter((l) => l.status === "rejected" || l.status === "expired" || l.status === "revoked");

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Parent requests</h1>

      {links.length === 0 && <p className={styles.body}>No parent has requested access to your account yet.</p>}

      {pending.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Pending requests</h2>
          <div className={styles.list}>
            {pending.map((link) => (
              <Card key={link.linkId} className={styles.row}>
                <div className={styles.rowHead}>
                  <p className={styles.parentName}>{link.parentName}</p>
                  <Badge variant="warning">Pending</Badge>
                </div>
                <ParentRequestActions linkId={link.linkId} />
              </Card>
            ))}
          </div>
        </section>
      )}

      {verified.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Linked parents</h2>
          <div className={styles.list}>
            {verified.map((link) => (
              <Card key={link.linkId} className={styles.row}>
                <div className={styles.rowHead}>
                  <p className={styles.parentName}>{link.parentName}</p>
                  <Badge variant="success">Verified</Badge>
                </div>
                <RevokeLinkButton linkId={link.linkId} role="student" />
              </Card>
            ))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>History</h2>
          <div className={styles.list}>
            {history.map((link) => (
              <Card key={link.linkId} className={styles.row}>
                <div className={styles.rowHead}>
                  <p className={styles.parentName}>{link.parentName}</p>
                  <Badge variant={HISTORY_BADGE[link.status as keyof typeof HISTORY_BADGE].variant}>
                    {HISTORY_BADGE[link.status as keyof typeof HISTORY_BADGE].label}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
