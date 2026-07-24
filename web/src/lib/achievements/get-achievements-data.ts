import type { createClient } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/dashboard/dashboard-aggregation";
import { mapAchievements, type AchievementDisplayItem } from "@/lib/achievements/achievements-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AchievementsData = {
  streak: number;
  achievements: AchievementDisplayItem[];
};

/**
 * Reads achievements_earned (Epic F7's new table) plus the same
 * messages.created_at query the Dashboard already uses for its streak
 * stat -- computeStreak() is reused as-is (lib/dashboard/
 * dashboard-aggregation.ts), per 02_Student_Experience.md's own note that
 * streak is derived at read time, no new table needed for that part.
 * Calls no agent; never writes.
 */
export async function getAchievementsData(
  supabase: SupabaseServerClient,
  studentId: string,
): Promise<AchievementsData | null> {
  const [achievementsRes, messagesRes] = await Promise.all([
    supabase
      .from("achievements_earned")
      .select("id, achievement_type, earned_at, metadata")
      .eq("student_id", studentId)
      .order("earned_at", { ascending: true }),
    supabase.from("messages").select("created_at").eq("role", "user"),
  ]);

  if (achievementsRes.error || messagesRes.error) {
    return null;
  }

  const rows = (achievementsRes.data ?? []).map((r) => ({
    id: r.id,
    achievementType: r.achievement_type,
    earnedAt: r.earned_at,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  }));

  return {
    streak: computeStreak((messagesRes.data ?? []).map((m) => new Date(m.created_at))),
    achievements: mapAchievements(rows),
  };
}
