import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAchievementsData } from "@/lib/achievements/get-achievements-data";
import { AchievementBadge } from "@/design-system/primitives/AchievementBadge";
import { AchievementIcon, StreakIcon } from "@/design-system/icons";
import buttonStyles from "@/design-system/primitives/Button/Button.module.css";
import styles from "./page.module.css";

/**
 * Achievements screen (Epic F7) -- docs/ui-architecture/
 * 02_Student_Experience.md's Achievements section: streak (largest
 * element) first, then a chronological grid of earned milestones. Reads
 * the new achievements_earned table plus the same streak derivation the
 * Dashboard already uses; calls no agent. Nothing in this sprint ever
 * writes to achievements_earned -- the award rule is explicitly out of
 * scope for that document, so a fresh account will only ever see the
 * empty state below until a future job exists to earn one.
 */
export default async function AchievementsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const studentId = claimsData!.claims!.sub as string;

  const achievementsData = await getAchievementsData(supabase, studentId);

  if (!achievementsData) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Achievements</h1>
        <p className={styles.body}>Couldn&apos;t load your achievements right now.</p>
      </div>
    );
  }

  const { streak, achievements } = achievementsData;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Achievements</h1>

      {streak > 0 && (
        <div className={styles.streak}>
          <StreakIcon size={40} aria-hidden="true" />
          <span className={styles.streakCount}>{streak}</span>
          <span className={styles.streakLabel}>day streak</span>
        </div>
      )}

      {achievements.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.body}>Your first achievement is one question away.</p>
          <Link href="/chat" className={`${buttonStyles.button} ${buttonStyles.primary}`}>
            Go to chat
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {achievements.map((achievement) => (
            <AchievementBadge
              key={achievement.id}
              icon={<AchievementIcon size={18} aria-hidden="true" />}
              label={achievement.label}
              celebrateKey={achievement.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
