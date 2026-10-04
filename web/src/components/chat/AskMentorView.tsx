"use client";

import { useState } from "react";
import { ChatShell } from "./ChatShell";
import { AskMentorWelcome, type ContinueLearningConcept } from "./AskMentorWelcome";
import type { ChatMessage } from "./MessageList";
import { useAvatarSession } from "@/components/voice/useAvatarSession";
import { DrPawsStage } from "@/components/voice/DrPawsStage";
import { DrPawsInvite } from "@/components/voice/DrPawsInvite";
import type { TurnMeta } from "@/lib/chat/types";
import styles from "./AskMentorView.module.css";

/**
 * Switches between the welcome state (no conversation started yet) and
 * the real ChatShell, entirely client-side -- no page reload. A quick
 * action or the welcome input's own submit just sets `pendingAutoSend`,
 * which ChatShell picks up via its existing `autoSendMessage` mount
 * effect (Sprint 4's onboarding mechanism) -- same send path as typing
 * into the conversation once it's started, nothing new added there.
 */
export function AskMentorView({
  initialConversationId,
  initialMessages,
  autoSendMessage,
  continueLearning,
  streak,
}: {
  initialConversationId: string | null;
  initialMessages: ChatMessage[];
  autoSendMessage?: string;
  continueLearning: ContinueLearningConcept | null;
  streak: number;
}) {
  const [pending, setPending] = useState<{ content: string; meta?: TurnMeta } | null>(null);
  const avatar = useAvatarSession();
  // Dr. Paws's stage is the default view. Its session connects only when the
  // student starts recording, so an idle tab uses no Tavus minutes.
  const [stageOpen, setStageOpen] = useState(true);
  const stageVisible = stageOpen;

  function openStage() {
    setStageOpen(true);
  }

  function hideStage() {
    setStageOpen(false);
    void avatar.end();
  }

  const hasStarted = initialMessages.length > 0 || Boolean(autoSendMessage) || Boolean(pending);

  const conversation = hasStarted ? (
    <ChatShell
      initialConversationId={initialConversationId}
      initialMessages={initialMessages}
      autoSendMessage={pending?.content ?? autoSendMessage}
      autoSendMeta={pending?.meta}
      avatar={avatar}
      drPawsOn={stageVisible}
    />
  ) : (
    <div className={styles.welcomeWrap}>
      <AskMentorWelcome
        onSubmit={(content, meta) => setPending({ content, meta })}
        onVoiceStart={() => void avatar.start()}
        continueLearning={continueLearning}
        streak={streak}
      />
    </div>
  );

  return (
    <div className={stageVisible ? styles.split : styles.single}>
      {stageVisible && (
        <DrPawsStage
          status={avatar.status}
          speaking={avatar.speaking}
          videoRef={avatar.videoRef}
          onEnd={() => void avatar.end()}
          onHide={hideStage}
        />
      )}
      <div className={styles.conversation}>{conversation}</div>
      {!stageVisible && <DrPawsInvite onOpen={openStage} />}
    </div>
  );
}
