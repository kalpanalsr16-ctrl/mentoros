"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "@/design-system/patterns/MessageBubble";
import { PracticeQuestionCard } from "@/design-system/patterns/PracticeQuestionCard";
import { AssessmentFeedbackCard } from "@/design-system/patterns/AssessmentFeedbackCard";
import { MemoryUpdateNote } from "@/design-system/patterns/MemoryUpdateNote";
import type { PracticeSet } from "@/lib/agents/practice-agent";
import type { AssessmentReport } from "@/lib/agents/assessment-agent";
import type { ReplyKind, MasteryUpdatePayload } from "@/lib/chat/types";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  // Additive, optional -- only present on assistant messages sent after
  // Sprint 2's /api/chat response-shape change; older messages loaded
  // from history (chat/page.tsx's initial load) simply won't have them,
  // and render as plain text, which is the correct fallback.
  replyKind?: ReplyKind;
  practiceSet?: PracticeSet;
  assessmentReport?: AssessmentReport;
  masteryUpdate?: MasteryUpdatePayload;
  // Sprint 3: set on assistant rows only (messages.trace_id, added in
  // 0007_messages_trace_id.sql). Null on user messages and on any row
  // inserted before Sprint 3 -- "View reasoning" simply doesn't render
  // for those, an honest degrade rather than a broken link.
  trace_id?: string | null;
};

export function MessageList({
  messages,
  onViewReasoning,
}: {
  messages: ChatMessage[];
  onViewReasoning: (traceId: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {messages.length === 0 && (
        <p style={{ opacity: 0.5, textAlign: "center", marginTop: "2rem" }}>
          Ask a question to get started.
        </p>
      )}
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} onViewReasoning={onViewReasoning} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageRow({
  message,
  onViewReasoning,
}: {
  message: ChatMessage;
  onViewReasoning: (traceId: string) => void;
}) {
  const viewReasoning = message.trace_id ? () => onViewReasoning(message.trace_id!) : undefined;

  if (message.role === "assistant" && message.replyKind === "practice" && message.practiceSet) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-start" }}>
        <PracticeQuestionCard practiceSet={message.practiceSet} onViewReasoning={viewReasoning} />
      </div>
    );
  }

  if (message.role === "assistant" && message.replyKind === "assessment" && message.assessmentReport) {
    return (
      <>
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <AssessmentFeedbackCard assessmentReport={message.assessmentReport} onViewReasoning={viewReasoning} />
        </div>
        {message.masteryUpdate && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <MemoryUpdateNote update={message.masteryUpdate} />
          </div>
        )}
      </>
    );
  }

  const variant = message.replyKind === "safety_decline" ? "safety" : message.role === "user" ? "user" : "assistant";
  return (
    <MessageBubble
      content={message.content}
      variant={variant}
      onViewReasoning={message.role === "assistant" ? viewReasoning : undefined}
    />
  );
}
