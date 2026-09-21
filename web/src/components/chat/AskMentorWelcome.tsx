"use client";

import { useState, type FormEvent } from "react";
import { PageContainer } from "@/design-system/layouts/PageContainer";
import { Card } from "@/design-system/primitives/Card";
import { ProgressRing } from "@/design-system/primitives/ProgressRing";
import { AchievementBadge } from "@/design-system/primitives/AchievementBadge";
import { Button } from "@/design-system/primitives/Button";
import { LinkButton } from "@/design-system/primitives/LinkButton";
import { StreakIcon } from "@/design-system/icons";
import { QuickActions } from "./QuickActions";
import styles from "./AskMentorWelcome.module.css";

export type ContinueLearningConcept = {
  conceptId: string;
  conceptName: string;
  masteryScore: number;
};

/**
 * Ask Mentor's empty-conversation state (learner UI redesign) -- replaces
 * a bare, immediately-visible message input with a real welcome screen.
 * Everything here still lands on the exact same /api/chat pipeline via
 * `onSubmit` (AskMentorView hands this off to ChatShell's existing
 * `autoSendMessage` mount effect) -- no new send path.
 */
export function AskMentorWelcome({
  onSubmit,
  continueLearning,
  streak,
}: {
  onSubmit: (text: string) => void;
  continueLearning: ContinueLearningConcept | null;
  streak: number;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  function handleContinue() {
    if (!continueLearning) return;
    // Same phrasing /chat's own ?autosend=revise&concept= path already
    // sends -- one message convention, not a second one invented here.
    onSubmit(`Can you help me revisit ${continueLearning.conceptName}?`);
  }

  return (
    <PageContainer narrow as="main">
      <div className={styles.page}>
        {streak > 0 && <AchievementBadge icon={<StreakIcon size={16} aria-hidden="true" />} label={`${streak}-day streak`} />}

        <h1 className={styles.heading}>What can I help you learn?</h1>

        <form onSubmit={handleSubmit} className={styles.inputRow}>
          <input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Ask Mentor anything..."
            className={styles.input}
          />
          <Button type="submit" disabled={!value.trim()}>
            Send
          </Button>
        </form>

        <QuickActions onSelect={setValue} />

        {continueLearning && (
          <Card className={styles.continueCard}>
            <p className={styles.continueLabel}>Continue learning</p>
            <div className={styles.continueBody}>
              <ProgressRing value={Math.round(continueLearning.masteryScore * 100)} size={44} />
              <div className={styles.continueText}>
                <p className={styles.continueConceptName}>{continueLearning.conceptName}</p>
                <LinkButton onClick={handleContinue}>Continue &rarr;</LinkButton>
              </div>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
