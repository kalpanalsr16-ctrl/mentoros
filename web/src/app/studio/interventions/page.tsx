import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listTeacherClasses } from "@/lib/teacher-roster/get-teacher-classes";
import { getInterventions } from "@/lib/interventions/get-interventions";
import { Card } from "@/design-system/primitives/Card";
import { Badge } from "@/design-system/primitives/Badge";
import { ClassPicker } from "../ClassPicker";
import styles from "./page.module.css";

const PRIORITY_BADGE = {
  0: { variant: "warning" as const, label: "Shared pattern" },
  1: { variant: "warning" as const, label: "At risk" },
  2: { variant: "neutral" as const, label: "Not started" },
};

/**
 * `/studio/interventions` (Epic G12) -- docs/ui-architecture/
 * 03_Teacher_Studio.md's Intervention Planner section: "suggested next
 * actions for struggling students, surfaced from mastery + misconception
 * data." Same class-picker/not-a-top-nav-item precedent as Misconceptions
 * (G10). Deep links go to Student Overview and Homework Generator
 * (pre-selecting the flagged concept there) -- this screen only
 * surfaces and links, per the design review's Non-Goals: no automated
 * assignment happens here.
 */
export default async function InterventionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const teacherId = claimsData!.claims!.sub as string;

  const classes = await listTeacherClasses(supabase, teacherId);
  if (!classes) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Interventions</h1>
        <p className={styles.body}>Couldn&apos;t load your classes right now.</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Interventions</h1>
        <p className={styles.body}>Create a class first to see suggested interventions.</p>
        <Link href="/studio/classes" className={styles.backLink}>
          Go to Classes
        </Link>
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;
  const requestedClassId = typeof resolvedSearchParams.classId === "string" ? resolvedSearchParams.classId : undefined;
  const classId = classes.some((c) => c.id === requestedClassId) ? requestedClassId! : classes[0].id;

  const result = await getInterventions(supabase, teacherId, classId);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Interventions</h1>

      <ClassPicker classes={classes.map((c) => ({ id: c.id, name: c.name }))} selectedClassId={classId} basePath="/studio/interventions" />

      {result.status === "error" && <p className={styles.body}>Couldn&apos;t load interventions for that class.</p>}
      {result.status === "forbidden" && <p className={styles.body}>That&apos;s not one of your classes.</p>}

      {result.status === "ok" &&
        (result.data.suggestions.length === 0 ? (
          <p className={styles.body}>No students currently need intervention in {result.data.className}.</p>
        ) : (
          <div className={styles.list}>
            {result.data.suggestions.map((s) => {
              const badge = PRIORITY_BADGE[s.priority];
              const homeworkHref = s.conceptId
                ? `/studio/homework?studentId=${s.studentId}&conceptId=${s.conceptId}`
                : `/studio/homework?studentId=${s.studentId}`;
              return (
                <Card key={`${s.studentId}-${s.conceptId ?? "start"}`} className={styles.row}>
                  <div className={styles.rowHead}>
                    <p className={styles.studentName}>{s.studentName}</p>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  <p className={styles.reason}>{s.reason}</p>
                  <div className={styles.actions}>
                    <Link href={`/studio/students/${s.studentId}`} className={styles.actionLink}>
                      View student
                    </Link>
                    <Link href={homeworkHref} className={styles.actionLink}>
                      Assign homework
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}
    </div>
  );
}
