"use client";

import { useState } from "react";
import { MessageList, type ChatMessage } from "./MessageList";
import { MessageInput } from "./MessageInput";

// Local state only — nothing here is persisted yet. Task M0-06 wires this
// up to the database and a real (placeholder) reply from the server.
export function ChatShell() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  function handleSend(content: string) {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content },
    ]);
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
      <MessageInput onSend={handleSend} />
    </div>
  );
}
