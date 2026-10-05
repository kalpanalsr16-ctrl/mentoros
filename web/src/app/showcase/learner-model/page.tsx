import { createClient } from "@/lib/supabase/server";
import { getLearnerModel } from "@/lib/learner-model/get-learner-model";
import type { LearnerModelConcept, PrerequisiteState } from "@/lib/learner-model/learner-model-aggregation";
import type { ConceptStatus } from "@/lib/learning-overview/learning-overview-aggregation";
import type { RetentionClassification } from "@/lib/retention/retention-aggregation";
import { Badge, type BadgeVariant } from "@/design-system/primitives/Badge";
import { Card } from "@/design-system/primitives/Card";
import styles from "./page.module.css";

const STATUS_LABEL: Record<ConceptStatus, string> = {
  new: "Not started",
  learning: "Learning",
  mastered: "Mastered",
  struggling: "Needs work",
};
const STATUS_VARIANT: Record<ConceptStatus, BadgeVariant> = {
  new: "neutral",
  learning: "brand",
  mastered: "success",
  struggling: "warning",
};
const RETENTION_LABEL: Record<RetentionClassification, string> = {
  strong: "Retention strong",
  fading: "Retention fading",
  review: "Review needed",
};
const RETENTION_VARIANT: Record<RetentionClassification, BadgeVariant> = {
  strong: "success",
  fading: "warning",
  review: "danger",
};
const PREREQUISITE_LABEL: Record<PrerequisiteState, string> = {
  mastered: "mastered",
  developing: "developing",
  missing: "not started",
};

function formatDate(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function LearnerModelPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const studentId = data?.claims?.sub as string;
  const model = await getLearnerModel(supabase, studentId);

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Learner Model</p>
      <h1 className={styles.heading}>What MentorOS knows about this learner</h1>
      <p className={styles.lead}>
        Built only from the published curriculum and assessed answers. Anything MentorOS has not measured is shown as
        not measured.
      </p>

      {!model && <p className={styles.muted}>The learner model couldn&apos;t be loaded right now.</p>}

      {model && (
        <>
          <Card className={styles.nextCard}>
            <p className={styles.label}>Why MentorOS recommends this next</p>
            {model.recommendedNext ? (
              <>
                <p className={styles.nextTitle}>{model.recommendedNext.conceptName}</p>
                <p className={styles.body}>{model.recommendedNext.reason}</p>
                <p className={styles.muted}>Estimated review time: about {model.recommendedNext.estimatedMinutes} minutes.</p>
              </>
            ) : (
              <p className={styles.body}>Nothing is due for review right now.</p>
            )}
            <p className={styles.muted}>
              {model.evidenceTotal > 0
                ? `Based on ${model.evidenceTotal} assessed answer${model.evidenceTotal === 1 ? "" : "s"}.`
                : "No assessed answers yet. Mastery appears after the first assessed answer."}
            </p>
          </Card>

          {model.chapters.map((chapter) => (
            <section key={chapter.chapterId} className={styles.chapter}>
              <h2 className={styles.chapterTitle}>{chapter.chapterTitle}</h2>
              <ul className={styles.conceptList}>
                {chapter.concepts.map((concept) => (
                  <ConceptRow key={concept.conceptId} concept={concept} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function ConceptRow({ concept }: { concept: LearnerModelConcept }) {
  return (
    <li className={styles.concept}>
      <div className={styles.conceptHead}>
        <h3 className={styles.conceptName}>{concept.conceptName}</h3>
        <div className={styles.badges}>
          <Badge variant={STATUS_VARIANT[concept.status]}>{STATUS_LABEL[concept.status]}</Badge>
          {concept.retentionStatus && (
            <Badge variant={RETENTION_VARIANT[concept.retentionStatus]}>{RETENTION_LABEL[concept.retentionStatus]}</Badge>
          )}
        </div>
      </div>

      <dl className={styles.facts}>
        <dt>Mastery</dt>
        <dd>{concept.status === "new" ? "Not assessed yet" : `${Math.round(concept.masteryScore)}%`}</dd>
        <dt>Attempts</dt>
        <dd>{concept.attempts}</dd>
        <dt>Assessed answers</dt>
        <dd>
          {concept.evidenceCount === 0
            ? "None recorded"
            : `${concept.evidenceCount} · last ${formatDate(concept.lastAssessedAt)}${concept.lastAssessedScore !== null ? ` (${Math.round(concept.lastAssessedScore)}/100)` : ""}`}
        </dd>
        <dt>Last practiced</dt>
        <dd>{formatDate(concept.lastPracticedAt)}</dd>
      </dl>

      <div className={styles.prereqs}>
        <p className={styles.label}>Prerequisites</p>
        {concept.prerequisites.length === 0 ? (
          <p className={styles.muted}>No prerequisite recorded in the published curriculum.</p>
        ) : (
          <ul className={styles.chips}>
            {concept.prerequisites.map((prereq) => (
              <li key={prereq.conceptId} className={styles.chip}>
                {prereq.conceptName}: {PREREQUISITE_LABEL[prereq.state]}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.misconceptions}>
        <p className={styles.label}>Recorded misconceptions</p>
        {concept.commonMistakes.length === 0 ? (
          <p className={styles.muted}>None recorded.</p>
        ) : (
          <ul className={styles.mistakeList}>
            {concept.commonMistakes.map((mistake) => (
              <li key={mistake}>{mistake}</li>
            ))}
          </ul>
        )}
      </div>

      <p className={styles.reasoning}>{concept.reasoning}</p>
    </li>
  );
}
