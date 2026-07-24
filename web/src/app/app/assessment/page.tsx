import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAssessmentHistoryData } from "@/lib/assessment-history/get-assessment-history";
import { AssessmentHistoryList } from "./AssessmentHistoryList";
import styles from "./page.module.css";

/**
 * Assessment History screen (Epic F5) -- docs/ui-architecture/
 * 02_Student_Experience.md's Assessment History section. Reads
 * Assessment Agent's past output via the `events` audit log; calls no
 * agent itself. The expand-on-tap interaction lives in the client
 * component AssessmentHistoryList, kept separate so this page stays a
 * server component for the initial data fetch.
 */
export default async function AssessmentHistoryPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const studentId = claimsData!.claims!.sub as string;

  const assessmentHistoryData = await getAssessmentHistoryData(supabase, studentId);

  if (!assessmentHistoryData) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Assessment history</h1>
        <p className={styles.body}>Couldn&apos;t load your assessment history right now.</p>
        <Link href="/app/assessment" className={styles.retryLink}>
          Try again
        </Link>
      </div>
    );
  }

  if (!assessmentHistoryData.hasActivity) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Assessment history</h1>
        <p className={styles.body}>No assessments yet. Ask MentorOS to test you on something.</p>
        <Link href="/chat" className={styles.retryLink}>
          Go to chat
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Assessment history</h1>
      <AssessmentHistoryList items={assessmentHistoryData.items} />
    </div>
  );
}
