import type { createClient } from "@/lib/supabase/server";
import { mapAchievements, type AchievementDisplayItem } from "@/lib/achievements/achievements-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Deliberately NOT a reuse of getAchievementsData() -- that function
 * also computes a streak from the `messages` table, which has no
 * parent-read policy at all (messages/conversations stay self-read
 * only, by design -- see 0012_events_teacher_read.sql's own note that
 * conversation content is never exposed to another role). Reusing it
 * as-is would silently show streak: 0 for every child, always, since
 * RLS would filter that query to nothing rather than error. The
 * architecture doc's Achievements section only calls for the badge row
 * anyway ("compact badge row"), not a streak count, so this reader
 * mirrors just that half.
 */
export async function getChildAchievements(supabase: SupabaseServerClient, studentId: string): Promise<AchievementDisplayItem[] | null> {
  const { data, error } = await supabase
    .from("achievements_earned")
    .select("id, achievement_type, earned_at, metadata")
    .eq("student_id", studentId)
    .order("earned_at", { ascending: true });

  if (error) return null;

  const rows = (data ?? []).map((r) => ({
    id: r.id,
    achievementType: r.achievement_type,
    earnedAt: r.earned_at,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  }));

  return mapAchievements(rows);
}
