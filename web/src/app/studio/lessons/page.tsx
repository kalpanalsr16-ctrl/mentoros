import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listTeacherClasses } from "@/lib/teacher-roster/get-teacher-classes";
import { listLessons } from "@/lib/teacher-lessons/list-lessons";
import { Card } from "@/design-system/primitives/Card";
import { Badge } from "@/design-system/primitives/Badge";
import { LessonClassFilter } from "./LessonClassFilter";
import { CreateLessonForm } from "./CreateLessonForm";
import { DeleteLessonButton } from "./DeleteLessonButton";
import styles from "./page.module.css";

const STATUS_BADGE = {
  draft: { variant: "neutral" as const, label: "Draft" },
  published: { variant: "success" as const, label: "Published" },
};

/**
 * `/studio/lessons` (Epic G8, Slice 2) -- docs/ui-architecture/
 * 03_Teacher_Studio.md's Lesson Planner section, manual-authoring
 * subset per the approved design. Mirrors Assessment Builder's list
 * page shape (create-then-edit, Card rows, per-row delete), plus a
 * class filter for the "organize by class" requirement.
 */
export default async function LessonsPage({
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
        <h1 className={styles.heading}>Lessons</h1>
        <p className={styles.body}>Couldn&apos;t load your classes right now.</p>
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;
  const requestedClassId = typeof resolvedSearchParams.classId === "string" ? resolvedSearchParams.classId : "";
  const classId = classes.some((c) => c.id === requestedClassId) ? requestedClassId : "";

  const lessons = await listLessons(supabase, teacherId, classId || undefined);
  if (!lessons) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Lessons</h1>
        <p className={styles.body}>Couldn&apos;t load your lesson plans right now.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Lessons</h1>

      {classes.length > 0 && <LessonClassFilter classes={classes.map((c) => ({ id: c.id, name: c.name }))} selectedClassId={classId} />}

      <CreateLessonForm classes={classes.map((c) => ({ id: c.id, name: c.name }))} />

      {lessons.length === 0 ? (
        <p className={styles.body}>
          {classId ? "No lesson plans for this class yet." : "Create your first lesson plan to get started."}
        </p>
      ) : (
        <div className={styles.list}>
          {lessons.map((lesson) => (
            <Card key={lesson.id} className={styles.row}>
              <Link href={`/studio/lessons/${lesson.id}`} className={styles.rowLink}>
                <p className={styles.lessonTitle}>{lesson.title}</p>
                <p className={styles.lessonMeta}>{lesson.className}</p>
              </Link>
              <Badge variant={STATUS_BADGE[lesson.status].variant}>{STATUS_BADGE[lesson.status].label}</Badge>
              <DeleteLessonButton lessonId={lesson.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
