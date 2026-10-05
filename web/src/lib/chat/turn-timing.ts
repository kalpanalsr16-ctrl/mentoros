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

/**
 * Critical-path breakdown (critical-path timing v1). Every segment is a
 * sequential, awaited span on the learner's path to the saved reply, measured
 * from the same turn start as wallClockMs. A segment is recorded only when its
 * work completed: a failed or cancelled span adds nothing, so no timing is
 * fabricated. Segments never overlap, so `residualMs` is the time not covered
 * by any segment: synchronous glue and object building, not a hidden stage.
 */
export type CriticalPathSegment =
  | "rateLimitMs"
  | "conversationMs"
  | "userInsertMs"
  | "historyMs"
  | "safetyMs"
  | "routerMs"
  | "planningMs"
  | "personalizationMs"
  | "generationMs"
  | "reflectionMs"
  | "memoryMs"
  | "persistMs";

export const CRITICAL_PATH_VERSION = 1;

export function createTurnTiming(elapsedMs: () => number) {
  const segments = new Map<CriticalPathSegment, number>();
  let telemetryWriteMs = 0;

  const record = (segment: CriticalPathSegment, startedAt: number) => {
    segments.set(segment, (segments.get(segment) ?? 0) + (elapsedMs() - startedAt));
  };

  return {
    async measure<T>(segment: CriticalPathSegment, work: () => Promise<T>): Promise<T> {
      const startedAt = elapsedMs();
      const value = await work();
      record(segment, startedAt);
      return value;
    },
    measureSync<T>(segment: CriticalPathSegment, work: () => T): T {
      const startedAt = elapsedMs();
      const value = work();
      record(segment, startedAt);
      return value;
    },
    /** Awaited telemetry writes on the learner's path. Reported apart from segments, so they are visible instead of residual. */
    async telemetry(write: () => Promise<void>): Promise<void> {
      const startedAt = elapsedMs();
      await write();
      telemetryWriteMs += elapsedMs() - startedAt;
    },
    /** Payload for reply_sent / safety_reply_sent. Only for a reply that was completed. */
    criticalPathFields(replyCompletedMs: number): { criticalPath: Record<string, number> } {
      const path: Record<string, number> = { criticalPathVersion: CRITICAL_PATH_VERSION };
      let attributed = 0;
      for (const [segment, ms] of segments) {
        path[segment] = ms;
        attributed += ms;
      }
      path.telemetryWriteMs = telemetryWriteMs;
      attributed += telemetryWriteMs;
      path.residualMs = replyCompletedMs - attributed;
      return { criticalPath: path };
    },
  };
}

export type TurnTiming = ReturnType<typeof createTurnTiming>;
