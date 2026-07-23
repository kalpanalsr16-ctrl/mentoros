import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listVerifiedChildren } from "@/lib/parent-links/list-verified-children";
import { getProgressData } from "@/lib/progress/get-progress-data";
import { summarizeChildProgress } from "@/lib/parent-portal/child-progress-summary";
import { getAssessmentHistoryData } from "@/lib/assessment-history/get-assessment-history";
import { deriveChildRecommendation } from "@/lib/parent-portal/child-recommendation";
import { getRevisionData } from "@/lib/revision/get-revision-data";
import { getChildAchievements } from "@/lib/parent-portal/get-child-achievements";
import { Card } from "@/design-system/primitives/Card";
import { Badge } from "@/design-system/primitives/Badge";
import { ProgressRing } from "@/design-system/primitives/ProgressRing";
import { AchievementBadge } from "@/design-system/primitives/AchievementBadge";
import { AchievementIcon } from "@/design-system/icons";
import styles from "./page.module.css";

const UPCOMING_REVISION_LIMIT = 3;

/**
 * `/parent/children/:studentId` -- H3 Sprint 3 adds Recommendations,
 * Revision Status, and Achievements, completing the child-detail
 * content per 04_Parent_Portal.md (Weekly Summary at /parent itself is
 * Sprint 4, the one section left).
 *
 * Every reader here is either reused completely unmodified from the
 * student-facing screen it mirrors (getProgressData, getRevisionData,
 * getAssessmentHistoryData -- RLS from 0017/0018 is what scopes them to
 * this parent's verified child) or a new lean parent-only reader that
 * deliberately avoids a field the student version computes from a table
 * with no parent-read policy (getChildAchievements skips the streak,
 * which getAchievementsData derives from `messages` -- see that file's
 * own comment).
 */
export default async function ChildDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const parentId = claimsData!.claims!.sub as string;

  const children = await listVerifiedChildren(supabase, parentId);
  const child = children.find((c) => c.studentId === studentId);

  if (!child) {
    return (
      <div className={styles.page}>
        <p className={styles.body}>That&apos;s not one of your linked children.</p>
        <Link href="/parent" className={styles.backLink}>
          Back to your children
        </Link>
      </div>
    );
  }

  const [progressData, assessmentHistory, revisionData, achievements] = await Promise.all([
    getProgressData(supabase, studentId),
    getAssessmentHistoryData(supabase, studentId),
    getRevisionData(supabase, studentId),
    getChildAchievements(supabase, studentId),
  ]);

  const summary = progressData?.hasActivity ? summarizeChildProgress(progressData.chapters) : null;
  const recommendation = assessmentHistory ? deriveChildRecommendation(assessmentHistory.items) : null;
  const upcomingRevision = [...(revisionData?.dueNow ?? []), ...(revisionData?.upcoming ?? [])].slice(0, UPCOMING_REVISION_LIMIT);

  return (
    <div className={styles.page}>
      <Link href="/parent" className={styles.backLink}>
        ← Back to your children
      </Link>
      <h1 className={styles.heading}>{child.displayName}</h1>

      {!summary && (
        <p className={styles.body}>
          {child.displayName} hasn&apos;t started practicing yet -- progress will show up here once they do.
        </p>
      )}

      {summary && (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>Progress</h2>
            <Card className={styles.progressCard}>
              <div className={styles.conceptGrid}>
                {summary.headlineConcepts.map((concept) => (
                  <div key={concept.conceptId} className={styles.conceptItem}>
                    <ProgressRing value={Math.round(concept.masteryScore * 100)} size={56} />
                    <p className={styles.conceptName}>{concept.conceptName}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {(summary.weakConcepts.length > 0 || summary.strongConcepts.length > 0) && (
            <section className={styles.section}>
              <h2 className={styles.sectionHeading}>Strengths &amp; weaknesses</h2>
              <div className={styles.strengthGrid}>
                {summary.weakConcepts.length > 0 && (
                  <Card className={styles.strengthCard}>
                    <p className={styles.strengthLabel}>Needs practice</p>
                    <ul className={styles.strengthList}>
                      {summary.weakConcepts.map((c) => (
                        <li key={c.conceptId} className={styles.strengthItem}>
                          <Badge variant="warning">{c.conceptName}</Badge>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
                {summary.strongConcepts.length > 0 && (
                  <Card className={styles.strengthCard}>
                    <p className={styles.strengthLabel}>Doing well</p>
                    <ul className={styles.strengthList}>
                      {summary.strongConcepts.map((c) => (
                        <li key={c.conceptId} className={styles.strengthItem}>
                          <Badge variant="success">{c.conceptName}</Badge>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {recommendation && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Recommendation</h2>
          <Card className={styles.recommendationCard}>
            <p className={styles.recommendationText}>{recommendation.sentence}</p>
          </Card>
        </section>
      )}

      {upcomingRevision.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Revision status</h2>
          <Card className={styles.revisionCard}>
            <ul className={styles.revisionList}>
              {upcomingRevision.map((item) => (
                <li key={item.id} className={styles.revisionItem}>
                  <span className={styles.revisionConcept}>{item.conceptName}</span>
                  {revisionData?.dueNow.some((r) => r.id === item.id) ? (
                    <Badge variant="warning">Due now</Badge>
                  ) : (
                    <Badge variant="neutral">Upcoming</Badge>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {achievements && achievements.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Achievements</h2>
          <div className={styles.achievementRow}>
            {achievements.map((achievement) => (
              <AchievementBadge key={achievement.id} icon={<AchievementIcon size={18} aria-hidden="true" />} label={achievement.label} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
