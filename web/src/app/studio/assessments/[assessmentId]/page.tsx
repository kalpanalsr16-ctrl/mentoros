import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAssessment } from "@/lib/teacher-assessments/get-assessment";
import { QuestionListBuilder } from "./QuestionListBuilder";
import styles from "./page.module.css";

/**
 * `/studio/assessments/:assessmentId` -- the question list builder
 * itself (03_Teacher_Studio.md's "question list builder" component).
 * A nonexistent id and someone else's assessment both render the same
 * "not one of your assessments" message -- getAssessment() already
 * collapses that ambiguity (RLS-filtered query), same pattern as every
 * other ownership-scoped detail page in this codebase.
 */
export default async function AssessmentDetailPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const teacherId = claimsData!.claims!.sub as string;

  const assessment = await getAssessment(supabase, teacherId, assessmentId);

  if (!assessment) {
    return (
      <div className={styles.page}>
        <p className={styles.body}>That&apos;s not one of your assessments.</p>
        <Link href="/studio/assessments" className={styles.backLink}>
          Back to assessments
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/studio/assessments" className={styles.backLink}>
        ← Back to assessments
      </Link>
      <QuestionListBuilder assessmentId={assessment.id} initialTitle={assessment.title} initialQuestions={assessment.questions} />
    </div>
  );
}
