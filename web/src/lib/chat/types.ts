/**
 * The additive, response-only fields `/api/chat` returns alongside
 * `assistantMessage.content` (Sprint 2, Chat Experience). Defined once
 * here so `route.ts` (the producer) and the chat UI (the consumer,
 * design-system/patterns/*) share one source of truth for this shape,
 * rather than each side re-declaring it. Pure type definitions only --
 * safe to import from client components.
 */

export type ReplyKind = "text" | "safety_decline" | "practice" | "assessment";

export type MasteryUpdatePayload = {
  conceptId: string;
  conceptName: string;
  masteryScore: number;
};
