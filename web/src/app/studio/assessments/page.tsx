import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listAssessments } from "@/lib/teacher-assessments/list-assessments";
import { Card } from "@/design-system/primitives/Card";
import { CreateAssessmentForm } from "./CreateAssessmentForm";
import { DeleteAssessmentButton } from "./DeleteAssessmentButton";
import styles from "./page.module.css";

/**
 * `/studio/assessments` (Epic G9) -- docs/ui-architecture/
 * 03_Teacher_Studio.md's Assessment Builder section: "author static
 * assessments ahead of time," distinct from Assessment Agent's live,
 * per-turn runtime evaluation. Manual authoring only this sprint -- the
 * doc's own "assessment authoring support" generation capability is
 * flagged as shared, undesigned future work (same capability named
 * under Lesson Planner), not part of this task.
 */
export default async function AssessmentsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const teacherId = claimsData!.claims!.sub as string;

  const assessments = await listAssessments(supabase, teacherId);

  if (!assessments) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Assessments</h1>
        <p className={styles.body}>Couldn&apos;t load your assessments right now.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Assessments</h1>

      <CreateAssessmentForm />

      {assessments.length === 0 ? (
        <p className={styles.body}>Create your first assessment to start building a question bank.</p>
      ) : (
        <div className={styles.list}>
          {assessments.map((a) => (
            <Card key={a.id} className={styles.row}>
              <Link href={`/studio/assessments/${a.id}`} className={styles.rowLink}>
                <p className={styles.assessmentTitle}>{a.title}</p>
                <p className={styles.assessmentMeta}>
                  {a.questionCount} {a.questionCount === 1 ? "question" : "questions"} · {a.totalPoints} {a.totalPoints === 1 ? "point" : "points"}
                </p>
              </Link>
              <DeleteAssessmentButton assessmentId={a.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
