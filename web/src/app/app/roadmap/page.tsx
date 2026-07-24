import { createClient } from "@/lib/supabase/server";
import { getRoadmapData } from "@/lib/roadmap/get-roadmap-data";
import { RoadmapPath } from "@/design-system/patterns/RoadmapPath";
import { Card } from "@/design-system/primitives/Card";
import styles from "./page.module.css";

/**
 * Learning Roadmap (Epic F3) -- docs/ui-architecture/02_Student_Experience.md's
 * visual path through the curriculum. Reads chapters/concepts/
 * concept_relationships (shared reference data) plus this student's own
 * learner_concept_mastery; calls no agent. The curriculum has only one
 * chapter today (NCERT Class 3 Math, per 09_Curriculum_Foundation.md) --
 * per the doc's own note, this is designed to look complete at that
 * scale, not sparse, so there's no dedicated "only one chapter" empty
 * state.
 */
export default async function RoadmapPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const studentId = claimsData!.claims!.sub as string;

  const roadmapData = await getRoadmapData(supabase, studentId);

  if (!roadmapData) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Your learning roadmap</h1>
        <p className={styles.body}>Couldn&apos;t load your roadmap right now.</p>
      </div>
    );
  }

  // Error state (data-shape fallback, not a load failure): the doc is
  // explicit that a broken/half-drawn path graphic must never render --
  // a plain list of concept names is the honest degraded view instead.
  if (roadmapData.degraded) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Your learning roadmap</h1>
        <ul className={styles.fallbackList}>
          {roadmapData.conceptNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Your learning roadmap</h1>

      {roadmapData.chapters.map((chapter) => (
        <Card key={chapter.chapterId} className={styles.chapterCard}>
          <p className={styles.chapterTitle}>{chapter.chapterTitle}</p>
          <RoadmapPath nodes={chapter.nodes} />
        </Card>
      ))}
    </div>
  );
}
