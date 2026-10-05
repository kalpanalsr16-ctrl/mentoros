/**
 * Learner-facing timing for one chat turn. Every value is measured from the
 * same boundary as the E1 wall-clock: the turn start after authentication.
 * See docs/PHASE_E_ARCHITECTURE_PERFORMANCE.md (E1) and
 * docs/PHASE_F_LATENCY_QUALITY_EXPERIMENT.md (measurement contract).
 */
export function createFirstContentTracker(elapsedMs: () => number) {
  let firstContentMs: number | null = null;
  return {
    /** A streamed text delta the student can see. Empty deltas do not count. */
    recordTextDelta(text: string): void {
      if (firstContentMs === null && text.length > 0) firstContentMs = elapsedMs();
    },
    /**
     * A complete, non-streamed model reply. It becomes visible when it is
     * saved, so first content and reply completion coincide for these turns.
     */
    recordCompleteReply(replyCompletedMs: number): void {
      if (firstContentMs === null) firstContentMs = replyCompletedMs;
    },
    value: (): number | null => firstContentMs,
  };
}

/** Clarification, safety declines, and fallbacks are not model output, so they get no first-content value. */
export function isModelGeneratedReply(replyKind: string, llmMetadata: Record<string, unknown>): boolean {
  return (
    replyKind !== "safety_decline" &&
    llmMetadata.isClarification !== true &&
    llmMetadata.isFallbackReply !== true
  );
}

/**
 * Fields for the reply_sent / safety_reply_sent payload. `wallClockMs` keeps
 * its E1 meaning (turn start to reply persisted, including any Evaluation
 * before the save). Turns whose Evaluation now runs after the save do not
 * carry it, so the same field never measures two different boundaries.
 */
export function replyTimingFields(input: {
  replyCompletedMs: number;
  evaluationDeferred: boolean;
  firstContentMs: number | null;
}): Record<string, number> {
  const fields: Record<string, number> = { replyCompletedMs: input.replyCompletedMs };
  if (!input.evaluationDeferred) fields.wallClockMs = input.replyCompletedMs;
  if (input.firstContentMs !== null) fields.firstContentMs = input.firstContentMs;
  return fields;
}
