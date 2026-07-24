"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/design-system/primitives/Button";
import { LinkButton } from "@/design-system/primitives/LinkButton";
import { ChipSelect } from "@/design-system/primitives/ChipSelect";
import {
  nextStep,
  isSkippable,
  buildProfilePatchBody,
  GRADE_OPTIONS,
  GOAL_OPTIONS,
  STYLE_OPTIONS,
  type OnboardingStep,
} from "@/lib/onboarding/onboarding-flow";
import styles from "./OnboardingFlow.module.css";

/**
 * Welcome experience + onboarding (Sprint 4, Epic F1). Writes to
 * `learner_profiles` via PATCH /api/student/profile -- a table Planning/
 * Personalization Agent already read from since M8 (postgres-learner-
 * state-provider.ts), never touched by any UI until now. "Start
 * Diagnostic" is an explicit action here (not a pre-filled message the
 * student has to remember to send), but still routes through the
 * ordinary /chat pipeline -- see chat/page.tsx's ?autosend handling.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [grade, setGrade] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [style, setStyle] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function goNext() {
    const next = nextStep(step);
    if (next) setStep(next);
  }

  async function finish(startDiagnostic: boolean) {
    setSaving(true);
    try {
      await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildProfilePatchBody({ grade, goals, style })),
      });
    } finally {
      // Navigate regardless of whether the PATCH succeeded -- a failed
      // profile save shouldn't strand a student on the onboarding screen;
      // worst case, Planning Agent just treats them as unknown a while
      // longer (its own existing, tested fallback), not a broken flow.
      router.push(startDiagnostic ? "/chat?autosend=diagnostic" : "/chat");
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        {isSkippable(step) && (
          <div className={styles.skipRow}>
            <LinkButton onClick={() => finish(false)}>Skip for now</LinkButton>
          </div>
        )}

        {step === "welcome" && (
          <>
            <p className={styles.eyebrow}>Welcome to MentorOS</p>
            <h1 className={styles.heading}>Let&apos;s set up your learning space</h1>
            <p className={styles.body}>
              A few quick questions help MentorOS teach in the way that works best for you. Takes less than a
              minute.
            </p>
            <Button type="button" onClick={goNext}>
              Let&apos;s go
            </Button>
          </>
        )}

        {step === "grade" && (
          <>
            <p className={styles.eyebrow}>Step 1 of 3</p>
            <h1 className={styles.heading}>What grade are you in?</h1>
            <ChipSelect options={GRADE_OPTIONS} value={grade} onChange={setGrade} aria-label="Grade" />
            <Button type="button" onClick={goNext} disabled={grade.length === 0}>
              Continue
            </Button>
          </>
        )}

        {step === "goals" && (
          <>
            <p className={styles.eyebrow}>Step 2 of 3</p>
            <h1 className={styles.heading}>What brings you here?</h1>
            <p className={styles.hint}>Choose as many as you like.</p>
            <ChipSelect options={GOAL_OPTIONS} value={goals} onChange={setGoals} multi aria-label="Learning goals" />
            <Button type="button" onClick={goNext}>
              Continue
            </Button>
          </>
        )}

        {step === "style" && (
          <>
            <p className={styles.eyebrow}>Step 3 of 3</p>
            <h1 className={styles.heading}>How do you like to learn?</h1>
            <ChipSelect options={STYLE_OPTIONS} value={style} onChange={setStyle} aria-label="Learning preference" />
            <Button type="button" onClick={goNext}>
              Continue
            </Button>
          </>
        )}

        {step === "diagnostic" && (
          <>
            <p className={styles.eyebrow}>Almost there</p>
            <h1 className={styles.heading}>Want to start with a quick diagnostic?</h1>
            <p className={styles.body}>
              MentorOS can ask a few questions to see where you&apos;re starting -- or you can jump straight into
              learning.
            </p>
            <div className={styles.actions}>
              <Button type="button" onClick={() => finish(true)} loading={saving}>
                Start Diagnostic
              </Button>
              <Button type="button" variant="secondary" onClick={() => finish(false)} disabled={saving}>
                Jump right in
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
