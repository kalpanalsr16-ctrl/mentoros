import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLearningOverview } from "@/lib/learning-overview/get-learning-overview";
import { getStudentConfusion } from "@/lib/misconceptions/get-student-confusion";
import { getRevisionQueue } from "@/lib/revision/get-revision-queue";
import { Card } from "@/design-system/primitives/Card";
import { Badge, type BadgeVariant } from "@/design-system/primitives/Badge";
import type { ConceptStatus } from "@/lib/learning-overview/learning-overview-aggregation";
import styles from "./page.module.css";

const STATUS_LABEL: Record<ConceptStatus, string> = {
  new: "New",
  learning: "Learning",
  mastered: "Mastered",
  struggling: "Struggling",
};

const STATUS_VARIANT: Record<ConceptStatus, BadgeVariant> = {
  new: "neutral",
  learning: "brand",
  mastered: "success",
  struggling: "danger",
};

/**
 * My Learning (learner UI redesign) -- a learner-intelligence view, not
 * a generic analytics dashboard: real per-concept status (see
 * learning-overview-aggregation.ts for exactly what's derivable today),
 * a Revision Queue preview, and Repeated Confusion. Every number here
 * comes from learner_concept_mastery/events -- nothing hardcoded.
 */
export default async function LearningPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const studentId = data!.claims!.sub as string;

  const [overview, confusion, revisionQueue] = await Promise.all([
    getLearningOverview(supabase, studentId),
    getStudentConfusion(supabase, studentId),
    getRevisionQueue(supabase, studentId),
  ]);

  if (!overview) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>My Learning</h1>
        <p className={styles.body}>Couldn&apos;t load your learning data right now.</p>
      </div>
    );
  }

  const hasAnyActivity = overview.some((chapter) => chapter.concepts.some((c) => c.status !== "new"));

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>My Learning</h1>

      {!hasAnyActivity && (
        <p className={styles.body}>Nothing tracked yet -- your progress will show up here after your first few questions.</p>
      )}

      <div className={styles.chapters}>
        {overview.map((chapter) => (
          <Card key={chapter.chapterId} className={styles.chapterCard}>
            <div className={styles.chapterHead}>
              <p className={styles.chapterTitle}>{chapter.chapterTitle}</p>
              {chapter.masteredPercent !== null && <span className={styles.chapterPercent}>{chapter.masteredPercent}% mastered</span>}
            </div>
            <div className={styles.conceptList}>
              {chapter.concepts.map((concept) => (
                <Link key={concept.conceptId} href={`/learning/${concept.conceptId}`} className={styles.conceptRow}>
                  <span className={styles.conceptName}>{concept.conceptName}</span>
                  <Badge variant={STATUS_VARIANT[concept.status]}>{STATUS_LABEL[concept.status]}</Badge>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeadRow}>
          <h2 className={styles.sectionHeading}>Revision queue</h2>
          <Link href="/learning/revision" className={styles.sectionLink}>
            View all &rarr;
          </Link>
        </div>
        <p className={styles.body}>
          {!revisionQueue || revisionQueue.dueNow.length === 0
            ? "Nothing flagged to revisit right now."
            : `${revisionQueue.dueNow.length} concept${revisionQueue.dueNow.length === 1 ? "" : "s"} recommended to revisit.`}
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Repeated confusion</h2>
        {!confusion || confusion.length === 0 ? (
          <p className={styles.body}>Nothing flagged more than once yet.</p>
        ) : (
          <div className={styles.confusionList}>
            {confusion.map((item) => (
              <Card key={item.text} className={styles.confusionCard}>
                <p className={styles.confusionText}>&ldquo;{item.text}&rdquo;</p>
                <p className={styles.confusionMeta}>
                  Flagged {item.frequency} times, same wording
                  {item.conceptNames.length > 0 ? ` -- ${item.conceptNames.join(", ")}` : ""}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
