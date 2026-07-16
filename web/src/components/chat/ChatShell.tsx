"use client";

import { useState } from "react";
import { MessageList, type ChatMessage } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { TransparencyPanel } from "@/design-system/patterns/TransparencyPanel";
import { LinkButton } from "@/design-system/primitives/LinkButton";
import { TransparencyIcon } from "@/design-system/icons";
import styles from "./ChatShell.module.css";

export function ChatShell({
  initialConversationId,
  initialMessages,
}: {
  initialConversationId: string | null;
  initialMessages: ChatMessage[];
}) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Transparency Panel (Sprint 3) -- off by default for students
  // (docs/design-system §13.2), scoped to one turn's trace_id at a time.
  // `panelOpen` and `activeTraceId` are independent: the panel can be
  // closed while still "remembering" the last-viewed trace, so reopening
  // the header toggle doesn't lose context.
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);

  function handleViewReasoning(traceId: string) {
    setActiveTraceId(traceId);
    setPanelOpen(true);
  }

  function handleTogglePanel() {
    if (!panelOpen) {
      // Opened generically (not via a specific message's "View reasoning")
      // -- default to the most recent assistant turn that has a trace,
      // per 05_Chat_Experience.md's "pre-scoped to the whole conversation
      // ... or one specific turn" framing.
      const latestAssistantWithTrace = [...messages].reverse().find((m) => m.role === "assistant" && m.trace_id);
      setActiveTraceId(latestAssistantWithTrace?.trace_id ?? null);
    }
    setPanelOpen((open) => !open);
  }

  async function handleSend(content: string) {
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error ?? "Something went wrong. Please try again.");
      }

      setConversationId(body.conversationId);
      // replyKind/practiceSet/assessmentReport/masteryUpdate are additive
      // response fields (Sprint 2) sitting alongside assistantMessage,
      // not inside the persisted row itself -- merged onto the message
      // object here so MessageList can render the right pattern.
      // `trace_id` (Sprint 3) IS part of the persisted row now
      // (route.ts's .select includes it), so it arrives via the spread.
      const assistantMessage: ChatMessage = {
        ...body.assistantMessage,
        replyKind: body.replyKind,
        practiceSet: body.practiceSet,
        assessmentReport: body.assessmentReport,
        masteryUpdate: body.masteryUpdate,
      };
      setMessages((prev) => [...prev, body.userMessage, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <div className={styles.toolbar}>
          <LinkButton icon={<TransparencyIcon aria-hidden="true" />} onClick={handleTogglePanel}>
            How I answered
          </LinkButton>
        </div>
        <MessageList messages={messages} onViewReasoning={handleViewReasoning} />
        {error && (
          <p
            style={{
              color: "#b3261e",
              fontSize: "0.875rem",
              padding: "0 1rem",
              margin: "0 0 0.5rem",
            }}
          >
            {error}
          </p>
        )}
        <MessageInput onSend={handleSend} disabled={sending} />
      </div>
      {panelOpen && (
        <div className={styles.panelWrap}>
          {/* Keyed on traceId so switching turns remounts the panel fresh
              (loading state, no stale previous trace) instead of needing
              an effect to reset state on prop change. */}
          <TransparencyPanel key={activeTraceId ?? "none"} traceId={activeTraceId} onClose={() => setPanelOpen(false)} />
        </div>
      )}
    </div>
  );
}
