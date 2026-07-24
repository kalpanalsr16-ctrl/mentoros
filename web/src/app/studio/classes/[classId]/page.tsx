import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getClassOverview } from "@/lib/teacher-roster/get-class-overview";
import { StatTile } from "@/design-system/primitives/StatTile";
import { Card } from "@/design-system/primitives/Card";
import { Badge } from "@/design-system/primitives/Badge";
import { ProgressRing } from "@/design-system/primitives/ProgressRing";
import { ManageRosterForm } from "./ManageRosterForm";
import styles from "./page.module.css";

/**
 * `/studio/classes/:classId` (Epic G3) -- docs/ui-architecture/
 * 03_Teacher_Studio.md's Class Overview section: "how is this class
 * performing, which students need attention, what concepts is the class
 * struggling with, what recent activity has occurred."
 */
export default async function ClassOverviewPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const teacherId = claimsData!.claims!.sub as string;

  const result = await getClassOverview(supabase, teacherId, classId);

  if (result.status === "error") {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Couldn&apos;t load that class</h1>
        <Link href="/studio/classes" className={styles.backLink}>
          Back to classes
        </Link>
      </div>
    );
  }

  if (result.status === "forbidden") {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>That&apos;s not one of your classes</h1>
        <Link href="/studio/classes" className={styles.backLink}>
          Back to classes
        </Link>
      </div>
    );
  }

  const { className, students, strugglingConcepts, classAvgMastery, atRiskCount, activity } = result.data;

  return (
    <div className={styles.page}>
      <Link href="/studio/classes" className={styles.backLink}>
        ← Classes
      </Link>
      <div className={styles.sectionHead}>
        <h1 className={styles.heading}>{className}</h1>
        <div className={styles.headerLinks}>
          <Link href={`/studio/interventions?classId=${classId}`} className={styles.backLink}>
            View interventions →
          </Link>
          <Link href={`/studio/homework?classId=${classId}`} className={styles.backLink}>
            Generate homework →
          </Link>
        </div>
      </div>

      <div className={styles.statGrid}>
        <StatTile label="Class avg mastery" value={classAvgMastery !== null ? `${Math.round(classAvgMastery * 100)}%` : "—"} />
        <StatTile label="Need attention" value={atRiskCount} />
        <StatTile label="Students" value={students.length} />
      </div>

      <section>
        <p className={styles.sectionLabel}>Roster</p>
        {students.length === 0 ? (
          <p className={styles.body}>No students enrolled yet.</p>
        ) : (
          <div className={styles.rosterList}>
            {students.map((s) => (
              <Card key={s.studentId} className={styles.rosterRow}>
                <Link href={`/studio/students/${s.studentId}`} className={styles.rosterLink}>
                  <ProgressRing value={s.avgMastery !== null ? Math.round(s.avgMastery * 100) : 0} size={40} />
                  <span className={styles.rosterName}>{s.studentName}</span>
                  {s.atRisk && <Badge variant="warning">Needs attention</Badge>}
                  {s.avgMastery === null && <Badge variant="neutral">Not started</Badge>}
                </Link>
                <ManageRosterForm classId={classId} studentId={s.studentId} mode="remove" />
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className={styles.sectionHead}>
          <p className={styles.sectionLabel}>Concepts the class is struggling with</p>
          <Link href={`/studio/misconceptions?classId=${classId}`} className={styles.backLink}>
            View misconception report →
          </Link>
        </div>
        {strugglingConcepts.length === 0 ? (
          <p className={styles.body}>No struggling concepts to show yet.</p>
        ) : (
          <div className={styles.conceptList}>
            {strugglingConcepts.map((c) => (
              <Card key={c.conceptId} className={styles.conceptRow}>
                <span className={styles.conceptName}>{c.conceptName}</span>
                <span className={styles.conceptMeta}>
                  {Math.round(c.avgMastery * 100)}% avg · {c.studentCount} {c.studentCount === 1 ? "student" : "students"}
                </span>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className={styles.sectionLabel}>Add a student</p>
        <ManageRosterForm classId={classId} mode="add" />
      </section>

      <section>
        <p className={styles.sectionLabel}>Recent activity</p>
        {activity.length === 0 ? (
          <p className={styles.body}>Nothing yet — activity from this class&apos;s students will show up here.</p>
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
