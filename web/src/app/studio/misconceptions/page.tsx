import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listTeacherClasses } from "@/lib/teacher-roster/get-teacher-classes";
import { getMisconceptionReport } from "@/lib/misconceptions/get-misconception-report";
import { Card } from "@/design-system/primitives/Card";
import { Badge } from "@/design-system/primitives/Badge";
import { ClassPicker } from "../ClassPicker";
import styles from "./page.module.css";

/**
 * `/studio/misconceptions` (Epic G10) -- docs/ui-architecture/
 * 03_Teacher_Studio.md's Misconception Reports section: "aggregated
 * misconception patterns across a class." Reached via a link from Class
 * Overview (03_Teacher_Studio.md's own 4-item top-nav scope leaves this
 * off the sidebar), with a class picker here for switching between
 * classes without going back.
 */
export default async function MisconceptionsPage({
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
        <h1 className={styles.heading}>Misconception Reports</h1>
        <p className={styles.body}>Couldn&apos;t load your classes right now.</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Misconception Reports</h1>
        <p className={styles.body}>Create a class first to see misconception patterns.</p>
        <Link href="/studio/classes" className={styles.backLink}>
          Go to Classes
        </Link>
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;
  const requestedClassId = typeof resolvedSearchParams.classId === "string" ? resolvedSearchParams.classId : undefined;
  const classId = classes.some((c) => c.id === requestedClassId) ? requestedClassId! : classes[0].id;

  const result = await getMisconceptionReport(supabase, teacherId, classId);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Misconception Reports</h1>

      <ClassPicker classes={classes.map((c) => ({ id: c.id, name: c.name }))} selectedClassId={classId} basePath="/studio/misconceptions" />

      {result.status === "error" && <p className={styles.body}>Couldn&apos;t load that class&apos;s misconception report.</p>}
      {result.status === "forbidden" && <p className={styles.body}>That&apos;s not one of your classes.</p>}

      {result.status === "ok" &&
        (result.data.misconceptions.length === 0 ? (
          <p className={styles.body}>No misconceptions recorded yet for {result.data.className}.</p>
        ) : (
          <div className={styles.list}>
            {result.data.misconceptions.map((item) => (
              <Card key={item.text} className={styles.row}>
                <div className={styles.rowHead}>
                  <p className={styles.text}>{item.text}</p>
                  <Badge variant="warning">
                    {item.frequency} {item.frequency === 1 ? "time" : "times"}
                  </Badge>
                </div>
                <p className={styles.affected}>{item.affectedStudents.join(", ")}</p>
              </Card>
            ))}
          </div>
        ))}
    </div>
  );
}
