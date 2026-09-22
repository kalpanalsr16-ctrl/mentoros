import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRevisionQueue } from "@/lib/revision/get-revision-queue";
import { Card } from "@/design-system/primitives/Card";
import { ProgressRing } from "@/design-system/primitives/ProgressRing";
import buttonStyles from "@/design-system/primitives/Button/Button.module.css";
import type { RevisionQueueItem } from "@/lib/revision/revision-queue-aggregation";
import styles from "./page.module.css";

const TIER_LABEL = {
  reviewNow: "Review now",
  reviewSoon: "Review soon",
  onWatch: "On watch",
} as const;

/**
 * Revision Queue (learner UI redesign, extended for My Learning) --
 * deliberately shows no due dates. There is no real spaced-repetition
 * scheduler in this codebase (revision_schedule has zero writers); this
 * reads live learner_concept_mastery instead and buckets concepts into 3
 * real urgency tiers derived from mastery + a recency-decay retention
 * estimate (see revision-queue-aggregation.ts) -- not literal
 * Today/Tomorrow/Later dates, which would imply a scheduler that doesn't
 * exist.
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

  const isEmpty = queue.reviewNow.length === 0 && queue.reviewSoon.length === 0 && queue.onWatch.length === 0;

  return (
    <div className={styles.page}>
      <div className={styles.headRow}>
        <h1 className={styles.heading}>Revision queue</h1>
        <Link href="/learning" className={styles.backLink}>
          &larr; My Learning
        </Link>
      </div>

      {isEmpty ? (
        <p className={styles.body}>Nothing flagged to revisit right now -- keep learning and this will fill in.</p>
      ) : (
        <>
          {(["reviewNow", "reviewSoon", "onWatch"] as const).map((tier) =>
            queue[tier].length > 0 ? (
              <section key={tier} className={styles.tierSection}>
                <h2 className={styles.tierHeading}>{TIER_LABEL[tier]}</h2>
                <div className={styles.list}>
                  {queue[tier].map((item: RevisionQueueItem) => (
                    <Card key={item.conceptId} className={styles.card}>
                      <div className={styles.cardBody}>
                        <ProgressRing value={Math.round(item.retentionScore * 100)} size={44} />
                        <div>
                          <p className={styles.conceptName}>{item.conceptName}</p>
                          <p className={styles.meta}>{item.reason}</p>
                        </div>
                      </div>
                      <Link
                        href={`/chat?autosend=revise&concept=${encodeURIComponent(item.conceptName)}`}
                        className={`${buttonStyles.button} ${buttonStyles.primary} ${buttonStyles.sm}`}
                      >
                        Review
                      </Link>
                    </Card>
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </>
      )}
    </div>
  );
}
