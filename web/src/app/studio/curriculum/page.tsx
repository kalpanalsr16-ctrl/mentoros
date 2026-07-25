import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listCurriculumConcepts } from "@/lib/teacher-homework/list-curriculum-concepts";
import { listCurriculumFilters } from "@/lib/curriculum/list-curriculum-filters";
import { CurriculumSearch } from "./CurriculumSearch";
import styles from "./page.module.css";

/**
 * `/studio/curriculum` (Epic G6, Postgres portion) --
 * docs/ui-architecture/03_Teacher_Studio.md's Curriculum Explorer:
 * "Browse MentorOS + Learning Commons curriculum." The doc bundles this
 * screen with the Learning Commons provider, but `PostgresCurriculumProvider`
 * (Epic G5) already works standalone -- this ships the browse experience
 * now, with Learning Commons results appearing alongside once G7 lands,
 * rather than leaving a shipped Studio Dashboard tile ("Explore
 * Curriculum") pointing at a placeholder in the meantime.
 *
 * Reuses listCurriculumConcepts() exactly as built for Homework
 * Generator (G13) for the default browse view -- same chapter-grouped
 * shape, now with optional grade/subject filters this sprint added.
 */
export default async function CurriculumExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; grade?: string }>;
}) {
  const { subject, grade } = await searchParams;
  const supabase = await createClient();
  const [chapters, filterOptions] = await Promise.all([
    listCurriculumConcepts(supabase, { subjectId: subject, gradeId: grade }),
    listCurriculumFilters(supabase),
  ]);

  const gradesForSubject = subject ? filterOptions.grades.filter((g) => g.subjectId === subject) : filterOptions.grades;

  return (
    <div className={styles.page}>
      <Link href="/studio" className={styles.backLink}>
        ← Studio
      </Link>
      <h1 className={styles.heading}>Curriculum Explorer</h1>
      <p className={styles.body}>
        Browse MentorOS&apos;s curriculum below, or search across it. Learning Commons isn&apos;t connected yet — every
        result today is MentorOS&apos;s own.
      </p>

      <CurriculumSearch />

      <form method="get" className={styles.filterForm}>
        <label className={styles.filterLabel}>
          Subject
          <select name="subject" defaultValue={subject ?? ""} className={styles.filterSelect}>
            <option value="">All subjects</option>
            {filterOptions.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterLabel}>
          Grade
          <select name="grade" defaultValue={grade ?? ""} className={styles.filterSelect}>
            <option value="">All grades</option>
            {gradesForSubject.map((g) => (
              <option key={g.id} value={g.id}>
                {g.gradeLevel}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={styles.filterButton}>
          Apply
        </button>
        {(subject || grade) && (
          <Link href="/studio/curriculum" className={styles.backLink}>
            Clear filters
          </Link>
        )}
      </form>

      {chapters.length === 0 ? (
        <p className={styles.body}>
          {subject || grade ? "No concepts for this grade/subject yet." : "No published curriculum content yet."}
        </p>
      ) : (
        <div className={styles.chapterList}>
          {chapters.map((chapter) => (
            <section key={chapter.chapterId} className={styles.chapterSection}>
              <h2 className={styles.chapterTitle}>{chapter.chapterTitle}</h2>
              <ul className={styles.conceptList}>
                {chapter.concepts.map((c) => (
                  <li key={c.conceptId} className={styles.conceptItem}>
                    <Link href={`/studio/curriculum/${c.conceptId}`} className={styles.conceptLink}>
                      {c.conceptName}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
