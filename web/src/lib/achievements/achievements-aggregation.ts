export type AchievementRow = {
  id: string;
  achievementType: string;
  earnedAt: string;
  metadata: Record<string, unknown>;
};

export type AchievementDisplayItem = {
  id: string;
  label: string;
  earnedAt: string;
};

/**
 * No fixed achievement-type catalog exists yet -- the award rule itself
 * is explicitly out of scope for this document (02_Student_Experience.md's
 * Achievements section: "application logic... not designed in this
 * document"). Rather than inventing labels for badge types this sprint
 * doesn't actually define, a future writer can set `metadata.label`
 * directly; absent that, this falls back to a readable formatting of
 * `achievement_type` itself (e.g. "first_practice" -> "First practice").
 */
export function formatAchievementLabel(achievementType: string, metadata: Record<string, unknown>): string {
  if (typeof metadata.label === "string" && metadata.label.trim().length > 0) {
    return metadata.label;
  }
  const words = achievementType.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Maps achievements_earned rows into the grid's display shape (Epic F7). Rows already arrive chronological (query orders by earned_at). */
export function mapAchievements(rows: AchievementRow[]): AchievementDisplayItem[] {
  return rows.map((row) => ({
    id: row.id,
    label: formatAchievementLabel(row.achievementType, row.metadata),
    earnedAt: row.earnedAt,
  }));
}
