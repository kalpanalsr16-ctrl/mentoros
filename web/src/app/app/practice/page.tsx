import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPracticeHistoryData } from "@/lib/practice-history/get-practice-history";
import { Card } from "@/design-system/primitives/Card";
import { Badge } from "@/design-system/primitives/Badge";
import styles from "./page.module.css";

const DIFFICULTY_BADGE = {
  Beginner: "neutral",
  Easy: "success",
  Medium: "brand",
  Advanced: "warning",
  Challenge: "danger",
} as const;

/**
 * Practice History screen (Epic F5) -- docs/ui-architecture/
 * 02_Student_Experience.md's Practice History section. Renders as a
 * stacked Card list at every breakpoint this sprint (the doc's desktop
 * Table variant is deferred -- Table doesn't exist yet in the Design
 * System, per 08_Component_Ownership.md, and building it wasn't in this
 * sprint's scope). Reads Practice Agent's past output via the `events`
 * audit log; calls no agent itself.
 */
export default async function PracticeHistoryPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const studentId = claimsData!.claims!.sub as string;

  const practiceHistoryData = await getPracticeHistoryData(supabase, studentId);

  if (!practiceHistoryData) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Practice history</h1>
        <p className={styles.body}>Couldn&apos;t load your practice history right now.</p>
        <Link href="/app/practice" className={styles.retryLink}>
          Try again
        </Link>
      </div>
    );
  }

  if (!practiceHistoryData.hasActivity) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Practice history</h1>
        <p className={styles.body}>
          You haven&apos;t done any practice yet. Ask MentorOS for practice questions to get started.
        </p>
        <Link href="/chat" className={styles.retryLink}>
          Go to chat
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Practice history</h1>

      {practiceHistoryData.items.map((item) => (
        <Card key={item.id} className={styles.row}>
          <div className={styles.rowMain}>
            <p className={styles.conceptName}>{item.conceptName}</p>
            <p className={styles.rowMeta}>
              {item.questionCount} question{item.questionCount === 1 ? "" : "s"} &middot;{" "}
              {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <Badge variant={DIFFICULTY_BADGE[item.difficulty]}>{item.difficulty}</Badge>
        </Card>
      ))}
    </div>
  );
}
