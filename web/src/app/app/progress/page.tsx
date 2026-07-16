import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProgressData } from "@/lib/progress/get-progress-data";
import { Card } from "@/design-system/primitives/Card";
import { Badge } from "@/design-system/primitives/Badge";
import { ProgressRing } from "@/design-system/primitives/ProgressRing";
import styles from "./page.module.css";

/**
 * Progress screen (Sprint 6, Epic F4) -- docs/ui-architecture/
 * 02_Student_Experience.md's "canonical how am I doing" screen. Reads
 * the same learner_concept_mastery data LearnerStateProvider already
 * uses for the live pipeline; this is a second reader, not a new write
 * path, and calls no agent.
 */
export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const studentId = claimsData!.claims!.sub as string;

  const progressData = await getProgressData(supabase, studentId);

  // Error state: retry only, no partial/stale data shown silently --
  // re-requesting the same route re-runs the server fetch.
  if (!progressData) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Your progress</h1>
        <p className={styles.body}>Couldn&apos;t load your progress right now.</p>
        <Link href="/app/progress" className={styles.retryLink}>
          Try again
        </Link>
      </div>
    );
  }

  if (!progressData.hasActivity) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Your progress</h1>
        <p className={styles.body}>Your progress will show up here after your first few questions.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Your progress</h1>

      {progressData.chapters.map((chapter) => (
        <Card key={chapter.chapterId} className={styles.chapterCard}>
          <p className={styles.chapterTitle}>{chapter.chapterTitle}</p>
          <div className={styles.conceptGrid}>
            {chapter.concepts.map((concept) => (
              <div key={concept.conceptId} className={styles.conceptItem}>
                <ProgressRing value={Math.round(concept.masteryScore * 100)} size={56} />
                <p className={styles.conceptName}>{concept.conceptName}</p>
                {concept.strength && (
                  <Badge variant={concept.strength === "weak" ? "warning" : "success"}>
                    {concept.strength === "weak" ? "Weak" : "Strong"}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
