/**
 * The additive, response-only fields `/api/chat` returns alongside
 * `assistantMessage.content` (Sprint 2, Chat Experience). Defined once
 * here so `route.ts` (the producer) and the chat UI (the consumer,
 * design-system/patterns/*) share one source of truth for this shape,
 * rather than each side re-declaring it. Pure type definitions only --
 * safe to import from client components.
 */

import type { PracticeSet } from "@/lib/agents/practice-agent";
import type { AssessmentReport } from "@/lib/agents/assessment-agent";

export type ReplyKind = "text" | "safety_decline" | "practice" | "assessment";

export type MasteryUpdatePayload = {
  conceptId: string;
  conceptName: string;
  masteryScore: number;
};

/**
 * Sprint 4 (streaming): the four-state model shown to the student while a
 * reply is in flight -- deliberately coarser than, and separate from, the
 * per-agent detail the AI Transparency Panel shows. "Preparing" is set
 * client-side the instant a request starts (nothing meaningful has
 * happened server-side yet); "Thinking"/"Teaching"/"Completed" are driven
 * by real pipeline checkpoints via StreamingEventBuilder, not a fake fixed
 * timer sequence.
 */
export type StreamingUserState = "Preparing" | "Thinking" | "Teaching" | "Completed";

export type MessageRow = { id: string; role: "user" | "assistant"; content: string; trace_id: string | null };

/**
 * The final event of every `/api/chat` stream -- identical in shape to
 * what this endpoint returned as its whole non-streaming JSON body before
 * Sprint 4. Every reply type ends the stream this way, whether or not it
 * emitted any `chunk` events first (see StreamEvent's own doc comment).
 */
export type ChatStreamDonePayload = {
  conversationId: string;
  userMessage: MessageRow;
  assistantMessage: MessageRow;
  traceId: string;
  replyKind: ReplyKind;
  practiceSet?: PracticeSet;
  assessmentReport?: AssessmentReport;
  masteryUpdate?: MasteryUpdatePayload;
};

/**
 * The wire protocol for `/api/chat`'s streaming response, built by
 * StreamingEventBuilder (lib/chat/streaming-event-builder.ts) and read by
 * parseChatStream (lib/chat/parse-chat-stream.ts) -- the only two places
 * that should know this shape exists. `chunk` only ever fires for the
 * free-text generateTeachingReply() path (Router/Safety/Concept/Practice/
 * Assessment/Reflection/Evaluation all use structured `messages.parse()`
 * output, which isn't meaningfully streamable as readable text) -- every
 * other reply type goes straight from `state: "Teaching"` to `done`.
 */
export type ChatStreamEvent =
  | { type: "state"; state: StreamingUserState }
  | { type: "chunk"; text: string }
  | { type: "done"; payload: ChatStreamDonePayload }
  | { type: "error"; message: string };
