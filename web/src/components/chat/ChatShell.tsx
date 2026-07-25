"use client";

import { useEffect, useRef, useState } from "react";
import { MessageList, type ChatMessage } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { TransparencyPanel } from "@/design-system/patterns/TransparencyPanel";
import { StreamingIndicator } from "@/design-system/patterns/StreamingIndicator";
import { LinkButton } from "@/design-system/primitives/LinkButton";
import { TransparencyIcon } from "@/design-system/icons";
import { parseChatStream } from "@/lib/chat/parse-chat-stream";
import type { StreamingUserState } from "@/lib/chat/types";
import styles from "./ChatShell.module.css";

export function ChatShell({
  initialConversationId,
  initialMessages,
  autoSendMessage,
}: {
  initialConversationId: string | null;
  initialMessages: ChatMessage[];
  /** Sprint 4: "Start Diagnostic" in onboarding lands here with a message already chosen -- sent once on mount through the same unmodified pipeline any typed message goes through. */
  autoSendMessage?: string;
}) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [sending, setSending] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingState, setStreamingState] = useState<StreamingUserState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // AI Transparency Panel (Sprint 3) -- off by default for students
  // (docs/design-system §13.2), scoped to one turn's trace_id at a time.
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);

  function handleViewReasoning(traceId: string) {
    setActiveTraceId(traceId);
    setPanelOpen(true);
  }

  function handleTogglePanel() {
    if (!panelOpen) {
      const latestAssistantWithTrace = [...messages].reverse().find((m) => m.role === "assistant" && m.trace_id);
      setActiveTraceId(latestAssistantWithTrace?.trace_id ?? null);
    }
    setPanelOpen((open) => !open);
  }

  /**
   * Shared by handleSend and handleRetry -- everything from opening the
   * fetch to reconciling the final `messages` array lives here once,
   * rather than duplicated per caller. `localUserContent` is null for a
   * retry (reusing the existing last user message already in `messages`,
   * nothing new to show optimistically).
   */
  async function sendRequest(requestBody: Record<string, unknown>, localUserContent: string | null) {
    setSending(true);
    setError(null);
    setStreamingState("Preparing");

    const tempUserId = localUserContent ? `pending-user-${crypto.randomUUID()}` : null;
    if (tempUserId && localUserContent) {
      setMessages((prev) => [...prev, { id: tempUserId, role: "user", content: localUserContent }]);
    }

    let draftId: string | null = null;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? "Something went wrong. Please try again.");
      }

      for await (const event of parseChatStream(response.body)) {
        if (event.type === "state") {
          setStreamingState(event.state);
        } else if (event.type === "chunk") {
          if (draftId === null) {
            draftId = `pending-assistant-${crypto.randomUUID()}`;
            const newDraftId = draftId;
            setStreamingMessageId(newDraftId);
            setMessages((prev) => [...prev, { id: newDraftId, role: "assistant", content: event.text }]);
          } else {
            const currentDraftId = draftId;
            setMessages((prev) =>
              prev.map((m) => (m.id === currentDraftId ? { ...m, content: m.content + event.text } : m)),
            );
          }
        } else if (event.type === "done") {
          setConversationId(event.payload.conversationId);
          const finalAssistantMessage: ChatMessage = {
            ...event.payload.assistantMessage,
            replyKind: event.payload.replyKind,
            practiceSet: event.payload.practiceSet,
            assessmentReport: event.payload.assessmentReport,
            masteryUpdate: event.payload.masteryUpdate,
          };
          setMessages((prev) => {
            const withoutDrafts = prev.filter((m) => m.id !== tempUserId && m.id !== draftId);
            // Retry reuses the existing user message already in `messages`
            // (never removed) -- only a normal send needs the server-
            // confirmed userMessage appended alongside the reply.
            return requestBody.retry
              ? [...withoutDrafts, finalAssistantMessage]
              : [...withoutDrafts, event.payload.userMessage, finalAssistantMessage];
          });
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Cancelled (Sprint 4) -- drop the partial draft, keep the
        // optimistic user message (it really was sent), no error banner.
        setMessages((prev) => prev.filter((m) => m.id !== draftId));
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setMessages((prev) => prev.filter((m) => m.id !== tempUserId && m.id !== draftId));
      }
    } finally {
      setSending(false);
      setStreamingMessageId(null);
      setStreamingState(null);
      abortControllerRef.current = null;
    }
  }

  async function handleSend(content: string) {
    await sendRequest({ conversationId, content }, content);
  }

  async function handleRetry() {
    if (!conversationId || sending) return;
    // Mirrors route.ts's own retry targeting -- the latest assistant
    // message is what gets superseded server-side, so it's removed from
    // local state the same way rather than waiting on a round trip to
    // find out.
    setMessages((prev) => {
      const lastAssistantIndex = [...prev].map((m) => m.role).lastIndexOf("assistant");
      if (lastAssistantIndex === -1) return prev;
      return prev.filter((_, i) => i !== lastAssistantIndex);
    });
    await sendRequest({ conversationId, retry: true }, null);
  }

  function handleCancel() {
    abortControllerRef.current?.abort();
  }

  const autoSentRef = useRef(false);
  useEffect(() => {
    if (autoSendMessage && !autoSentRef.current) {
      autoSentRef.current = true;
      handleSend(autoSendMessage);
    }
    // Fires once on mount only -- autoSendMessage is a one-time launch
    // parameter (Sprint 4's "Start Diagnostic"), not a value to resend on
    // every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <div className={styles.toolbar}>
          <LinkButton icon={<TransparencyIcon aria-hidden="true" />} onClick={handleTogglePanel}>
            How I answered
          </LinkButton>
        </div>
        <MessageList
          messages={messages}
          streamingMessageId={streamingMessageId}
          onViewReasoning={handleViewReasoning}
          onRetry={sending ? undefined : handleRetry}
        />
        {streamingState && streamingState !== "Completed" && <StreamingIndicator state={streamingState} />}
        {error && <p className={styles.errorBanner}>{error}</p>}
        <MessageInput onSend={handleSend} onCancel={handleCancel} disabled={sending} />
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
