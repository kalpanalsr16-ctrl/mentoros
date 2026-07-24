import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStudentOverview } from "@/lib/teacher-roster/get-student-overview";
import { formatSuggestedAction } from "@/lib/teacher-roster/student-overview-aggregation";
import { Card } from "@/design-system/primitives/Card";
import { Badge } from "@/design-system/primitives/Badge";
import { ProgressRing } from "@/design-system/primitives/ProgressRing";
import { AssessmentFeedbackCard, STATUS_BADGE } from "@/design-system/patterns/AssessmentFeedbackCard";
import styles from "./page.module.css";

/**
 * `/studio/students/:studentId` (Epic G4) -- docs/ui-architecture/
 * 03_Teacher_Studio.md's Student Overview section: "what has this
 * student learned, strengths/weaknesses, current mastery, what should
 * the teacher do next." The 403-without-a-verified-relationship path is
 * this sprint's stated primary acceptance criterion
 * (13_Implementation_Sequence.md) -- exercised via getStudentOverview's
 * explicit ownership check, not left to RLS alone.
 */
export default async function StudentOverviewPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const teacherId = claimsData!.claims!.sub as string;

  const result = await getStudentOverview(supabase, teacherId, studentId);

  if (result.status === "error") {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Couldn&apos;t load that student</h1>
        <Link href="/studio/classes" className={styles.backLink}>
          Back to classes
        </Link>
      </div>
    );
  }

  if (result.status === "forbidden") {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>That student isn&apos;t in one of your classes</h1>
        <Link href="/studio/classes" className={styles.backLink}>
          Back to classes
        </Link>
      </div>
    );
  }

  const { studentName, grade, chapters, atRisk, suggestedAction, misconceptions, recentAssessments } = result.data;
  const actionText = formatSuggestedAction(suggestedAction, studentName);

  return (
    <div className={styles.page}>
      <Link href="/studio/classes" className={styles.backLink}>
        ← Classes
      </Link>
      <div className={styles.sectionHead}>
        <h1 className={styles.heading}>
          {studentName}
          {grade ? <span className={styles.gradeTag}>Grade {grade}</span> : null}
        </h1>
        <Link href={`/studio/homework?studentId=${studentId}`} className={styles.backLink}>
          Generate homework →
        </Link>
      </div>

      {atRisk && actionText && (
        <Card className={styles.attentionBanner}>
          <Badge variant="warning">Needs attention</Badge>
          <p className={styles.attentionText}>{actionText}</p>
        </Card>
      )}
      {!atRisk && actionText && (
        <Card className={styles.startBanner}>
          <p className={styles.attentionText}>{actionText}</p>
        </Card>
      )}

      <section>
        <p className={styles.sectionLabel}>Mastery</p>
        {chapters.length === 0 ? (
          <p className={styles.body}>No mastery data yet — this student hasn&apos;t started practicing.</p>
        ) : (
          chapters.map((chapter) => (
            <Card key={chapter.chapterId} className={styles.chapterCard}>
              <p className={styles.chapterTitle}>{chapter.chapterTitle}</p>
              <div className={styles.conceptGrid}>
                {chapter.concepts.map((concept) => (
                  <div key={concept.conceptId} className={styles.conceptItem}>
                    <ProgressRing value={Math.round(concept.masteryScore * 100)} size={56} />
                    <p className={styles.conceptName}>{concept.conceptName}</p>
                    {concept.strength && (
                      <Badge variant={concept.strength === "weak" ? "warning" : "success"}>
                        {concept.strength === "weak" ? "Weak" : "Strong"}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </section>

      {misconceptions.length > 0 && (
        <section>
          <p className={styles.sectionLabel}>Misconceptions worth reviewing</p>
          <ul className={styles.misconceptionList}>
            {misconceptions.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className={styles.sectionLabel}>Recent assessments</p>
        {recentAssessments.length === 0 ? (
          <p className={styles.body}>No assessments completed yet.</p>
        ) : (
          <div className={styles.assessmentList}>
            {recentAssessments.map((item) => (
              <div key={item.id} className={styles.assessmentEntry}>
                <div className={styles.assessmentHead}>
                  <p className={styles.assessmentConcept}>{item.conceptName}</p>
                  <Badge variant={STATUS_BADGE[item.report.status]}>{item.report.status}</Badge>
                  <span className={styles.assessmentDate}>
                    {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
                <AssessmentFeedbackCard assessmentReport={item.report} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
