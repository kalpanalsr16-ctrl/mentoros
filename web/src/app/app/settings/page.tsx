import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";
import styles from "./page.module.css";

/**
 * Settings screen (Epic F8) -- docs/ui-architecture/02_Student_Experience.md's
 * Settings section: account-level preferences (email, password), distinct
 * from Profile's *learning* preferences. Uses Supabase Auth's existing
 * client-side methods directly, per the doc's own note -- no new
 * MentorOS API for fields this app doesn't own. Notification preferences
 * are explicitly "future, named not built" in the doc, so not rendered
 * here.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const currentEmail = (claimsData?.claims?.email as string | undefined) ?? "";

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Settings</h1>
      <SettingsForm currentEmail={currentEmail} />
    </div>
  );
}
