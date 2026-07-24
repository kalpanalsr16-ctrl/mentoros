import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ProfileData = {
  grade: number | null;
  confidence: string | null;
  preferredLearningStyle: string | null;
  learningGoals: string[];
};

const EMPTY_PROFILE: ProfileData = {
  grade: null,
  confidence: null,
  preferredLearningStyle: null,
  learningGoals: [],
};

/**
 * Reads the preference fields of `learner_profiles` (Epic F8) -- shared
 * between GET /api/student/profile and app/app/profile/page.tsx's own
 * server-side render, same split as get-dashboard-data.ts/
 * get-progress-data.ts. A student with no row yet (never onboarded, or
 * skipped every step) isn't an error -- it's every field unset, per
 * Profile's own "not applicable" empty-state note in
 * 02_Student_Experience.md.
 */
export async function getProfileData(
  supabase: SupabaseServerClient,
  studentId: string,
): Promise<ProfileData | null> {
  const { data, error } = await supabase
    .from("learner_profiles")
    .select("grade, confidence, preferred_learning_style, learning_goals")
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    return null;
  }

  if (!data) {
    return EMPTY_PROFILE;
  }

  return {
    grade: data.grade,
    confidence: data.confidence,
    preferredLearningStyle: data.preferred_learning_style,
    learningGoals: data.learning_goals ?? [],
  };
}
