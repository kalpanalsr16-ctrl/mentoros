import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTeacherDashboardData } from "@/lib/teacher-dashboard/get-teacher-dashboard-data";
import { StatTile } from "@/design-system/primitives/StatTile";
import { Card } from "@/design-system/primitives/Card";
import { LessonPlanIcon, AssessmentBuilderIcon, CurriculumIcon } from "@/design-system/icons";
import styles from "./page.module.css";

/**
 * Studio Dashboard (Epic G2) -- docs/ui-architecture/03_Teacher_Studio.md's
 * Dashboard section: three action tiles matching the Design System's
 * wireframe exactly, a StatTile row (classes, students, recent
 * activity), and an activity feed. Calls no agent -- reads classes/
 * class_students (this teacher's own) and events/profiles (teacher-scoped
 * RLS, 0012/0013) for the feed.
 */
export default async function StudioDashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const teacherId = claimsData!.claims!.sub as string;

  const dashboardData = await getTeacherDashboardData(supabase, teacherId);

  if (!dashboardData) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Studio</h1>
        <p className={styles.body}>Couldn&apos;t load your dashboard right now.</p>
      </div>
    );
  }

  const { classCount, studentCount, activity } = dashboardData;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Studio</h1>

      <div className={styles.actionGrid}>
        <Link href="/studio/lessons" className={styles.actionTile}>
          <Card className={styles.actionCard}>
            <LessonPlanIcon size={24} aria-hidden="true" />
            <p className={styles.actionLabel}>Plan a Lesson</p>
          </Card>
        </Link>
        <Link href="/studio/assessments" className={styles.actionTile}>
          <Card className={styles.actionCard}>
            <AssessmentBuilderIcon size={24} aria-hidden="true" />
            <p className={styles.actionLabel}>Build an Assessment</p>
          </Card>
        </Link>
        <Link href="/studio/curriculum" className={styles.actionTile}>
          <Card className={styles.actionCard}>
            <CurriculumIcon size={24} aria-hidden="true" />
            <p className={styles.actionLabel}>Explore Curriculum</p>
          </Card>
        </Link>
      </div>

      <div className={styles.statGrid}>
        <StatTile label="Classes" value={classCount} />
        <StatTile label="Students" value={studentCount} />
        <StatTile label="Recent activity" value={activity.length} />
      </div>

      <section className={styles.activitySection}>
        <p className={styles.sectionLabel}>Recent activity</p>
        {activity.length === 0 ? (
          <p className={styles.body}>
            Nothing yet — activity from students in your classes will show up here.
          </p>
        ) : (
          <div className={styles.activityFeed}>
            {activity.map((item) => (
              <Card key={item.id} className={styles.activityRow}>
                <p className={styles.activityText}>
                  <strong>{item.studentName}</strong> {item.description}
                </p>
                <p className={styles.activityTime}>
                  {new Date(item.timestamp).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
