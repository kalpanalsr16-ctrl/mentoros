import { createClient } from "@/lib/supabase/server";
import { listCurriculumConcepts } from "@/lib/teacher-homework/list-curriculum-concepts";
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
 * shape, no new aggregation logic.
 */
export default async function CurriculumExplorerPage() {
  const supabase = await createClient();
  const chapters = await listCurriculumConcepts(supabase);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Curriculum Explorer</h1>
      <p className={styles.body}>
        Browse MentorOS&apos;s curriculum below, or search across it. Learning Commons isn&apos;t connected yet — every
        result today is MentorOS&apos;s own.
      </p>

      <CurriculumSearch />

      {chapters.length === 0 ? (
        <p className={styles.body}>No published curriculum content yet.</p>
      ) : (
        <div className={styles.chapterList}>
          {chapters.map((chapter) => (
            <section key={chapter.chapterId} className={styles.chapterSection}>
              <h2 className={styles.chapterTitle}>{chapter.chapterTitle}</h2>
              <ul className={styles.conceptList}>
                {chapter.concepts.map((c) => (
                  <li key={c.conceptId} className={styles.conceptItem}>
                    {c.conceptName}
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
