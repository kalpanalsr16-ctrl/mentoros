"use client";

import { useState } from "react";
import { Button } from "@/design-system/primitives/Button";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

type FieldStatus = "idle" | "saving" | "saved" | "error";

/**
 * Two independent account actions -- email and password -- each with its
 * own inline error/success state, matching sign-in/sign-up's existing
 * error-surface convention (a single message per submitted action, not a
 * per-character validator). Both call Supabase Auth's updateUser()
 * directly; MentorOS has no account-fields API of its own, per
 * 02_Student_Experience.md's Settings section.
 */
export function SettingsForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail);
  const [emailStatus, setEmailStatus] = useState<FieldStatus>("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<FieldStatus>("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setEmailStatus("saving");
    setEmailError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email });

    if (error) {
      setEmailStatus("error");
      setEmailError(error.message);
      return;
    }
    setEmailStatus("saved");
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError(null);

    if (password.length < 8) {
      setPasswordStatus("error");
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordStatus("error");
      setPasswordError("Passwords don't match.");
      return;
    }

    setPasswordStatus("saving");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setPasswordStatus("error");
      setPasswordError(error.message);
      return;
    }
    setPasswordStatus("saved");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <div className={styles.form}>
      <form onSubmit={handleEmailSubmit} className={styles.field}>
        <h2 className={styles.fieldLabel}>Email</h2>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailStatus === "saved" || emailStatus === "error") setEmailStatus("idle");
          }}
          className={styles.input}
        />
        {emailStatus === "error" && <p className={styles.errorBanner}>{emailError}</p>}
        {emailStatus === "saved" && (
          <p className={styles.savedNote}>Check your new inbox to confirm the change.</p>
        )}
        <Button type="submit" loading={emailStatus === "saving"} disabled={email === currentEmail}>
          Update email
        </Button>
      </form>

      <form onSubmit={handlePasswordSubmit} className={styles.field}>
        <h2 className={styles.fieldLabel}>Password</h2>
        <input
          type="password"
          placeholder="New password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordStatus === "saved" || passwordStatus === "error") setPasswordStatus("idle");
          }}
          className={styles.input}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          required
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (passwordStatus === "saved" || passwordStatus === "error") setPasswordStatus("idle");
          }}
          className={styles.input}
        />
        {passwordStatus === "error" && <p className={styles.errorBanner}>{passwordError}</p>}
        {passwordStatus === "saved" && <p className={styles.savedNote}>Password updated.</p>}
        <Button type="submit" loading={passwordStatus === "saving"}>
          Change password
        </Button>
      </form>
    </div>
  );
}
