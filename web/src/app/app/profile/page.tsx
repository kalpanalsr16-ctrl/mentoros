import { createClient } from "@/lib/supabase/server";
import { getProfileData } from "@/lib/profile/get-profile-data";
import { ProfileForm } from "./ProfileForm";
import styles from "./page.module.css";

/**
 * Profile screen (Epic F8) -- docs/ui-architecture/02_Student_Experience.md's
 * Profile section: "grade, goals, learning style — the exact inputs
 * Personalization Agent already consumes but today has no UI to collect."
 * This is the persistent, editable form version of Onboarding's own
 * 3-question flow (Sprint 4) -- same option sets, same PATCH endpoint,
 * reused rather than re-specified. Personalization Agent picks up any
 * change on the *next* chat turn; nothing here calls an agent directly.
 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const studentId = claimsData!.claims!.sub as string;

  const profileData = await getProfileData(supabase, studentId);

  if (!profileData) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Your profile</h1>
        <p className={styles.body}>Couldn&apos;t load your profile right now.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Your profile</h1>
      <p className={styles.body}>Update these any time — MentorOS uses them to teach in the way that works for you.</p>
      <ProfileForm initial={profileData} />
    </div>
  );
}
