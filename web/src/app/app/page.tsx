import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { PageContainer } from "@/design-system/layouts/PageContainer";
import { StatTile } from "@/design-system/primitives/StatTile";
import { AchievementBadge } from "@/design-system/primitives/AchievementBadge";
import { Card } from "@/design-system/primitives/Card";
import { ProgressRing } from "@/design-system/primitives/ProgressRing";
import { StreakIcon } from "@/design-system/icons";
import buttonStyles from "@/design-system/primitives/Button/Button.module.css";
import styles from "./page.module.css";

/**
 * Student Dashboard (Sprint 5, Epic F2) -- docs/ui-architecture/
 * 02_Student_Experience.md's exact information hierarchy: one "continue
 * learning" prompt, a mastery snapshot, streak, one revision suggestion.
 * Nothing else, per Design Principle 1.2 applied to the whole page.
 * Server-rendered directly against getDashboardData() rather than
 * client-fetching GET /api/student/dashboard (which exists for the same
 * data, per the doc's own API contract) -- avoids a self-fetch round
 * trip for the page's own initial render.
 */
export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const studentId = claimsData!.claims!.sub as string;

  const dashboardData = await getDashboardData(supabase, studentId);

  // Error state: the aggregate failed -- degrade to the one action that
  // always works, per the doc's graceful-degradation rule.
  if (!dashboardData) {
    return (
      <PageContainer narrow as="main">
        <div className={styles.page}>
          <h1 className={styles.heading}>Your dashboard</h1>
          <p className={styles.body}>We couldn&apos;t load your progress right now.</p>
          <Link href="/chat" className={`${buttonStyles.button} ${buttonStyles.primary}`}>
            Continue learning
          </Link>
        </div>
      </PageContainer>
    );
  }

  // Empty state: first-ever sign-in, no mastery data yet.
  if (!dashboardData.hasActivity) {
    return (
      <PageContainer narrow as="main">
        <div className={styles.page}>
          <h1 className={styles.heading}>Your dashboard</h1>
          <p className={styles.body}>Your progress will show up here after your first few questions.</p>
          <Link href="/chat" className={`${buttonStyles.button} ${buttonStyles.primary}`}>
            Continue learning
          </Link>
        </div>
      </PageContainer>
    );
  }

  const { streak, recentConcepts, revisionSuggestion } = dashboardData;

  return (
    <PageContainer narrow as="main">
      <div className={styles.page}>
        <h1 className={styles.heading}>Your dashboard</h1>

        <Link href="/chat" className={`${buttonStyles.button} ${buttonStyles.primary}`}>
          Continue learning
        </Link>

        {streak > 0 && <AchievementBadge icon={<StreakIcon />} label={`${streak}-day streak`} />}

        {recentConcepts.length > 0 && (
          <div className={styles.statGrid}>
            {recentConcepts.map((concept) => (
              <StatTile
                key={concept.conceptId}
                label={concept.conceptName}
                value={`${Math.round(concept.masteryScore * 100)}%`}
              />
            ))}
          </div>
        )}

        {revisionSuggestion && (
          <Card className={styles.suggestionCard}>
            <p className={styles.suggestionLabel}>Suggested</p>
            <div className={styles.suggestionBody}>
              <ProgressRing value={Math.round(revisionSuggestion.masteryScore * 100)} size={44} />
              <p className={styles.suggestionText}>Revisit &ldquo;{revisionSuggestion.conceptName}&rdquo;</p>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
