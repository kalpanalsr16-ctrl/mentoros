"use client";

import { useState } from "react";
import { MessageBubble } from "@/design-system/patterns/MessageBubble";
import { MessageInput } from "@/components/chat/MessageInput";
import styles from "./page.module.css";

type AssistantMessage = { role: "user" | "assistant"; content: string };

/**
 * `/studio/assistant` (Epic G14) -- reuses MessageBubble/MessageInput
 * from the student chat pattern set, per docs/ui-architecture/
 * 08_Component_Ownership.md. Single ongoing conversation, no
 * conversation-list UI -- same "no multi-conversation management" scope
 * decision the approved design proposal made, mirroring how /chat itself
 * started. No streaming: POST /api/teacher/assistant returns one
 * complete JSON response per turn, not SSE.
 */
export function AssistantChat({
  initialConversationId,
  initialMessages,
}: {
  initialConversationId: string | null;
  initialMessages: AssistantMessage[];
}) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<AssistantMessage[]>(initialMessages);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(content: string) {
    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content }]);

    try {
      const res = await fetch("/api/teacher/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Couldn't send that message.");
        return;
      }

      setConversationId(json.conversationId);
      setMessages((prev) => [...prev, json.assistantMessage]);
    } catch {
      setError("Couldn't send that message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.chatShell}>
      <div className={styles.messages}>
        {messages.length === 0 && (
          <p className={styles.empty}>Ask for help brainstorming a lesson, explaining a concept, or drafting assessment questions.</p>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} content={m.content} variant={m.role === "user" ? "user" : "assistant"} />
        ))}
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <MessageInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
