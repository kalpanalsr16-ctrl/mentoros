import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRevisionData } from "@/lib/revision/get-revision-data";
import { Card } from "@/design-system/primitives/Card";
import buttonStyles from "@/design-system/primitives/Button/Button.module.css";
import type { RevisionItem } from "@/lib/revision/revision-aggregation";
import styles from "./page.module.css";

/**
 * Revision Planner (Epic F6) -- docs/ui-architecture/02_Student_Experience.md's
 * Revision Planner section: due-now items first, upcoming after, each
 * tied to a specific weak concept. Reads the new revision_schedule table;
 * calls no agent. Nothing in this sprint ever writes to
 * revision_schedule -- the scheduling algorithm is explicitly out of
 * scope for that document, so every account sees the (genuinely
 * positive) empty state below until a future job exists to populate it.
 */
export default async function RevisionPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const studentId = claimsData!.claims!.sub as string;

  const revisionData = await getRevisionData(supabase, studentId);

  if (!revisionData) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Revision planner</h1>
        <p className={styles.body}>Couldn&apos;t load your revision plan right now.</p>
        <Link href="/app/revision" className={styles.retryLink}>
          Try again
        </Link>
      </div>
    );
  }

  const { dueNow, upcoming } = revisionData;

  if (dueNow.length === 0 && upcoming.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Revision planner</h1>
        <p className={styles.body}>Nothing due for revision right now — keep learning and this will fill in.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Revision planner</h1>

      {dueNow.length > 0 && (
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Due now</p>
          {dueNow.map((item) => (
            <RevisionCard key={item.id} item={item} />
          ))}
        </section>
      )}

      {upcoming.length > 0 && (
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Upcoming</p>
          {upcoming.map((item) => (
            <RevisionCard key={item.id} item={item} />
          ))}
        </section>
      )}
    </div>
  );
}

function RevisionCard({ item }: { item: RevisionItem }) {
  return (
    <Card className={styles.card}>
      <div>
        <p className={styles.conceptName}>{item.conceptName}</p>
        <p className={styles.dueAt}>
          {new Date(item.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
      <Link
        href={`/chat?autosend=revise&concept=${encodeURIComponent(item.conceptName)}`}
        className={`${buttonStyles.button} ${buttonStyles.primary} ${buttonStyles.sm}`}
      >
        Revise now
      </Link>
    </Card>
  );
}
