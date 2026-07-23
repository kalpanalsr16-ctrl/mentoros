import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listCurriculumConcepts } from "@/lib/teacher-homework/list-curriculum-concepts";
import { HomeworkForm } from "./HomeworkForm";
import styles from "./page.module.css";

/**
 * `/studio/homework` (Epic G13) -- docs/ui-architecture/
 * 03_Teacher_Studio.md's Homework Generator section: "generate take-home
 * practice sets for a student or class." Reached via a `?classId=` or
 * `?studentId=` link from Class Overview / Student Overview (same
 * not-a-top-nav-item precedent as Misconceptions, G10) -- arriving with
 * neither points the teacher back to Classes rather than guessing a
 * target.
 */
export default async function HomeworkGeneratorPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const studentId = typeof resolvedSearchParams.studentId === "string" ? resolvedSearchParams.studentId : undefined;
  const classId = typeof resolvedSearchParams.classId === "string" ? resolvedSearchParams.classId : undefined;

  if (!studentId && !classId) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Homework Generator</h1>
        <p className={styles.body}>
          Start from a class or student page to generate homework — open a class or student, then use the
          &quot;Generate homework&quot; link there.
        </p>
        <Link href="/studio/classes" className={styles.backLink}>
          Go to Classes
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const chapters = await listCurriculumConcepts(supabase);

  let targetName = "this student";
  if (classId) {
    const { data } = await supabase.from("classes").select("name").eq("id", classId).maybeSingle();
    targetName = data?.name ?? "this class";
  } else if (studentId) {
    const { data } = await supabase.from("profiles").select("display_name").eq("id", studentId).maybeSingle();
    targetName = data?.display_name ?? "this student";
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Homework Generator</h1>
      <p className={styles.body}>Generating for {targetName}.</p>

      {chapters.length === 0 ? (
        <p className={styles.body}>No published curriculum concepts are available yet.</p>
      ) : (
        <HomeworkForm chapters={chapters} studentId={studentId} classId={classId} />
      )}
    </div>
  );
}
