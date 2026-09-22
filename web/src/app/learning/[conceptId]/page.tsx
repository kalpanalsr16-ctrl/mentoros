import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getConceptDetail } from "@/lib/learning-journey/get-concept-journey";
import { Card } from "@/design-system/primitives/Card";
import { Badge, type BadgeVariant } from "@/design-system/primitives/Badge";
import { ProgressRing } from "@/design-system/primitives/ProgressRing";
import { AssessmentFeedbackCard } from "@/design-system/patterns/AssessmentFeedbackCard";
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
 * Concept Detail (learner UI redesign) -- real per-concept history:
 * mastery/attempts/last-practiced/common-mistakes from
 * learner_concept_mastery, plus this concept's own practice and
 * assessment events. Deliberately no "times explained" stat or
 * clarification count -- neither is reliably attributable to a specific
 * concept from stored events (see concept-journey-aggregation.ts).
 */
export default async function ConceptDetailPage({ params }: { params: Promise<{ conceptId: string }> }) {
  const { conceptId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const studentId = data!.claims!.sub as string;

  const detail = await getConceptDetail(supabase, studentId, conceptId);

  if (!detail) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Concept not found</h1>
        <Link href="/learning" className={styles.backLink}>
          &larr; My Learning
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/learning" className={styles.backLink}>
        &larr; My Learning
      </Link>

      <div className={styles.headRow}>
        <h1 className={styles.heading}>{detail.conceptName}</h1>
        <Badge variant={STATUS_VARIANT[detail.status]}>{STATUS_LABEL[detail.status]}</Badge>
      </div>

      <div className={styles.statGrid}>
        <Card className={styles.statCard}>
          <ProgressRing value={detail.masteryScore} size={48} />
          <p className={styles.statLabel}>Understanding</p>
        </Card>
        {detail.retentionScore !== null && (
          <Card className={styles.statCard}>
            <ProgressRing value={detail.retentionScore} size={48} />
            <p className={styles.statLabel}>Retention</p>
          </Card>
        )}
        <Card className={styles.statCard}>
          <p className={styles.statValue}>{detail.attempts}</p>
          <p className={styles.statLabel}>Attempts</p>
        </Card>
        <Card className={styles.statCard}>
          <p className={styles.statValue}>
            {detail.lastPracticedAt
              ? new Date(detail.lastPracticedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              : "—"}
          </p>
          <p className={styles.statLabel}>Last practiced</p>
        </Card>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Why MentorOS thinks this</h2>
        <p className={styles.body}>{detail.reasoning}</p>
      </section>

      {detail.commonMistakes.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Common mistakes</h2>
          <ul className={styles.mistakeList}>
            {detail.commonMistakes.map((mistake) => (
              <li key={mistake}>{mistake}</li>
            ))}
          </ul>
        </section>
      )}

      {detail.journey.assessmentItems.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Assessment history</h2>
          <div className={styles.list}>
            {detail.journey.assessmentItems.map((item) => (
              <AssessmentFeedbackCard key={item.id} assessmentReport={item.report} />
            ))}
          </div>
        </section>
      )}

      {detail.journey.practiceItems.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Practice history</h2>
          <div className={styles.list}>
            {detail.journey.practiceItems.map((item) => (
              <Card key={item.id} className={styles.practiceRow}>
                <span>{new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                {item.difficulty && <span>{item.difficulty}</span>}
                {item.questionCount && <span>{item.questionCount} questions</span>}
              </Card>
            ))}
          </div>
        </section>
      )}

      {detail.status === "new" && (
        <p className={styles.body}>You haven&apos;t started this concept yet.</p>
      )}
    </div>
  );
}
