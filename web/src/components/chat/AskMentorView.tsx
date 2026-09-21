"use client";

import { useState } from "react";
import { ChatShell } from "./ChatShell";
import { AskMentorWelcome, type ContinueLearningConcept } from "./AskMentorWelcome";
import type { ChatMessage } from "./MessageList";
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
  const [pendingAutoSend, setPendingAutoSend] = useState<string | null>(null);

  const hasStarted = initialMessages.length > 0 || Boolean(autoSendMessage) || Boolean(pendingAutoSend);

  if (!hasStarted) {
    return (
      <div className={styles.welcomeWrap}>
        <AskMentorWelcome onSubmit={setPendingAutoSend} continueLearning={continueLearning} streak={streak} />
      </div>
    );
  }

  return (
    <ChatShell
      initialConversationId={initialConversationId}
      initialMessages={initialMessages}
      autoSendMessage={pendingAutoSend ?? autoSendMessage}
    />
  );
}
