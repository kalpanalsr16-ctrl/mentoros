import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRevisionQueue } from "@/lib/revision/get-revision-queue";
import { Card } from "@/design-system/primitives/Card";
import { ProgressRing } from "@/design-system/primitives/ProgressRing";
import buttonStyles from "@/design-system/primitives/Button/Button.module.css";
import styles from "./page.module.css";

/**
 * Revision Queue (learner UI redesign) -- deliberately shows no due
 * dates. There is no real spaced-repetition scheduler in this codebase
 * (revision_schedule has zero writers); this reads live
 * learner_concept_mastery instead and surfaces concepts currently below
 * the weak threshold as "recommended now," ordered weakest first. The
 * LEARN -> PRACTICE -> DETECT WEAKNESS -> REVISIT -> VERIFY RETENTION ->
 * MASTER loop is a real future direction, but only the "detect weakness"
 * and "revisit" steps are backed by real data today -- this page is
 * honest about being that, not further along.
 */
export default async function RevisionQueuePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const studentId = data!.claims!.sub as string;

  const queue = await getRevisionQueue(supabase, studentId);

  if (!queue) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Revision queue</h1>
        <p className={styles.body}>Couldn&apos;t load your revision queue right now.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.headRow}>
        <h1 className={styles.heading}>Revision queue</h1>
        <Link href="/learning" className={styles.backLink}>
          &larr; My Learning
        </Link>
      </div>

      {queue.dueNow.length === 0 ? (
        <p className={styles.body}>Nothing flagged to revisit right now -- keep learning and this will fill in.</p>
      ) : (
        <div className={styles.list}>
          {queue.dueNow.map((item) => (
            <Card key={item.conceptId} className={styles.card}>
              <div className={styles.cardBody}>
                <ProgressRing value={Math.round(item.masteryScore * 100)} size={44} />
                <div>
                  <p className={styles.conceptName}>{item.conceptName}</p>
                  <p className={styles.meta}>
                    {item.lastPracticedAt
                      ? `Last practiced ${new Date(item.lastPracticedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                      : "Not practiced yet"}
                  </p>
                </div>
              </div>
              <Link
                href={`/chat?autosend=revise&concept=${encodeURIComponent(item.conceptName)}`}
                className={`${buttonStyles.button} ${buttonStyles.primary} ${buttonStyles.sm}`}
              >
                Revise now
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
