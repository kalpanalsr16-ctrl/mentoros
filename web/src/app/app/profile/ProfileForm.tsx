"use client";

import { useState } from "react";
import { Button } from "@/design-system/primitives/Button";
import { ChipSelect } from "@/design-system/primitives/ChipSelect";
import { GRADE_OPTIONS, GOAL_OPTIONS, STYLE_OPTIONS } from "@/lib/onboarding/onboarding-flow";
import type { ProfileData } from "@/lib/profile/get-profile-data";
import styles from "./page.module.css";

export function ProfileForm({ initial }: { initial: ProfileData }) {
  const [grade, setGrade] = useState<string[]>(initial.grade ? [String(initial.grade)] : []);
  const [goals, setGoals] = useState<string[]>(initial.learningGoals);
  const [style, setStyle] = useState<string[]>(initial.preferredLearningStyle ? [initial.preferredLearningStyle] : []);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSave() {
    setStatus("saving");
    try {
      // Unlike Onboarding's buildProfilePatchBody() (which only ever
      // includes a field the student actually answered, so Skip never
      // clobbers a prior answer), this is an edit form -- the visible
      // state IS the desired state, so learningGoals is always sent,
      // including empty, or clearing every goal chip would silently fail
      // to save.
      const body: Record<string, unknown> = { learningGoals: goals };
      if (grade[0]) body.grade = Number(grade[0]);
      if (style[0]) body.preferredLearningStyle = style[0];

      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      // Save failure keeps every entered value on screen -- never
      // silently discards input on error, per 02_Student_Experience.md's
      // Profile error-state note.
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={styles.form}>
      <section className={styles.field}>
        <h2 className={styles.fieldLabel}>Grade</h2>
        <ChipSelect options={GRADE_OPTIONS} value={grade} onChange={setGrade} aria-label="Grade" />
      </section>

      <section className={styles.field}>
        <h2 className={styles.fieldLabel}>What brings you here?</h2>
        <ChipSelect options={GOAL_OPTIONS} value={goals} onChange={setGoals} multi aria-label="Learning goals" />
      </section>

      <section className={styles.field}>
        <h2 className={styles.fieldLabel}>How do you like to learn?</h2>
        <ChipSelect options={STYLE_OPTIONS} value={style} onChange={setStyle} aria-label="Learning preference" />
      </section>

      {status === "error" && <p className={styles.errorBanner}>Couldn&apos;t save your profile. Please try again.</p>}
      {status === "saved" && <p className={styles.savedNote}>Saved.</p>}

      <Button type="button" onClick={handleSave} loading={status === "saving"}>
        Save
      </Button>
    </div>
  );
}
