import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLesson } from "@/lib/teacher-lessons/get-lesson";
import { listTeacherClasses } from "@/lib/teacher-roster/get-teacher-classes";
import { listCurriculumConcepts } from "@/lib/teacher-homework/list-curriculum-concepts";
import { LessonEditor } from "./LessonEditor";
import styles from "./page.module.css";

/**
 * `/studio/lessons/:lessonId` (Epic G8, Slice 3) -- the lesson editor
 * itself. A nonexistent id and someone else's lesson both render the
 * same "not one of your lesson plans" message -- getLesson() already
 * collapses that ambiguity, same pattern as Assessment Builder's detail
 * page. The concept picker reuses listCurriculumConcepts() unmodified
 * (already built for Homework Generator) rather than standing up a new
 * CurriculumProvider-based UI, per the approved design.
 */
export default async function LessonDetailPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const teacherId = claimsData!.claims!.sub as string;

  const lesson = await getLesson(supabase, teacherId, lessonId);

  if (!lesson) {
    return (
      <div className={styles.page}>
        <p className={styles.body}>That&apos;s not one of your lesson plans.</p>
        <Link href="/studio/lessons" className={styles.backLink}>
          Back to lessons
        </Link>
      </div>
    );
  }

  const [classes, chapters] = await Promise.all([listTeacherClasses(supabase, teacherId), listCurriculumConcepts(supabase)]);

  return (
    <div className={styles.page}>
      <Link href="/studio/lessons" className={styles.backLink}>
        ← Back to lessons
      </Link>
      <LessonEditor lesson={lesson} classes={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))} chapters={chapters} />
    </div>
  );
}
