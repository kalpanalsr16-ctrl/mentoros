"use client";

import { useState } from "react";
import { MessageList, type ChatMessage } from "./MessageList";
import { MessageInput } from "./MessageInput";

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <MessageList messages={messages} />
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
  );
}
