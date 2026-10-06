/**
 * Learner-facing timing for one chat turn. Every value is measured from the
 * same boundary as the E1 wall-clock: the turn start after authentication.
 * See docs/PHASE_E_ARCHITECTURE_PERFORMANCE.md (E1) and
 * docs/PHASE_F_LATENCY_QUALITY_EXPERIMENT.md (measurement contract).
 */
export type FirstContentSource = "general_chunk" | "concept_explanation_char" | "saved_reply";

export function createFirstContentTracker(elapsedMs: () => number) {
  let firstContentMs: number | null = null;
  let firstContentSource: FirstContentSource | null = null;
  return {
    /** A streamed text delta the student can see. Empty deltas do not count. */
    recordTextDelta(text: string, source: FirstContentSource = "general_chunk"): void {
      if (firstContentMs === null && text.length > 0) {
        firstContentMs = elapsedMs();
        firstContentSource = source;
      }
    },
    /**
     * A complete, non-streamed model reply. It becomes visible when it is
     * saved, so first content and reply completion coincide for these turns.
     */
    recordCompleteReply(replyCompletedMs: number): void {
      if (firstContentMs === null) {
        firstContentMs = replyCompletedMs;
        firstContentSource = "saved_reply";
      }
    },
    value: (): number | null => firstContentMs,
    source: (): FirstContentSource | null => firstContentSource,
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
 * Payload for response_done, written after the final `done` event. It cannot
 * live on reply_sent because reply_sent is written before `done`. The gap
 * between the two is the awaited reply_sent write, which this makes visible.
 * replyCompletedMs is unchanged; this only reports when `done` was emitted.
 */
export function responseDoneFields(input: { replyCompletedMs: number; responseDoneMs: number }): Record<string, number> {
  return {
    responseDoneMs: input.responseDoneMs,
    postReplyCompletionMs: input.responseDoneMs - input.replyCompletedMs,
  };
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

/**
 * Version of the additive timing fields written next to criticalPath
 * (authMs, preGeneration*, telemetry split, responseDone). Version 2 adds
 * them. criticalPathVersion stays 1 because the criticalPath object itself
 * is unchanged. Turns written before version 2 do not carry these fields.
 */
export const TIMING_FIELDS_VERSION = 2;

export type GenerationAgent = "Concept" | "Practice" | "Assessment" | "General";

/**
 * Turn identity measured outside the E1 clock (authMs) and the deploy the
 * turn ran on. Reported on every reply_sent, and on terminal events only when
 * generation began.
 */
export type TurnIdentity = { authMs: number | null; deployCommit: string | null };

const UNMEASURED_IDENTITY: TurnIdentity = { authMs: null, deployCommit: null };

export function createTurnTiming(elapsedMs: () => number, identity: TurnIdentity = UNMEASURED_IDENTITY) {
  const segments = new Map<CriticalPathSegment, number>();
  let telemetryWriteMs = 0;
  let preGenerationTelemetryWriteMs = 0;
  let postGenerationTelemetryWriteMs = 0;
  let generation: { agent: GenerationAgent; startedMs: number; residualMs: number } | null = null;

  const record = (segment: CriticalPathSegment, startedAt: number) => {
    segments.set(segment, (segments.get(segment) ?? 0) + (elapsedMs() - startedAt));
  };

  const attributedSegmentsMs = () => {
    let total = 0;
    for (const ms of segments.values()) total += ms;
    return total;
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
    /**
     * Called immediately before the final learner-response model request
     * begins. The first call wins: a turn has one generation call. Calls
     * before generation starts are the pre-generation span.
     */
    markGenerationStart(agent: GenerationAgent): void {
      if (generation !== null) return;
      const startedMs = elapsedMs();
      // Valid only while pre-generation spans are sequential (timingFieldsVersion 2). Overlapping spans need a new version.
      generation = {
        agent,
        startedMs,
        residualMs: startedMs - attributedSegmentsMs() - preGenerationTelemetryWriteMs,
      };
    },
    /** Awaited telemetry writes on the learner's path. Reported apart from segments, so they are visible instead of residual. */
    async telemetry(write: () => Promise<void>): Promise<void> {
      const startedAt = elapsedMs();
      const beforeGeneration = generation === null;
      await write();
      const ms = elapsedMs() - startedAt;
      telemetryWriteMs += ms;
      if (beforeGeneration) {
        preGenerationTelemetryWriteMs += ms;
      } else {
        postGenerationTelemetryWriteMs += ms;
      }
    },
    /**
     * Additive fields for reply_sent / safety_reply_sent, outside criticalPath.
     * preGenerationMs, generationAgent, and preGenerationResidualMs exist only
     * when generation began. Clarification, safety declines, and turns that
     * never reach generation carry none of them, so no timing is fabricated.
     * Telemetry split: pre + post always equals criticalPath.telemetryWriteMs.
     */
    instrumentationFields(): Record<string, number | string | null> {
      const fields: Record<string, number | string | null> = {
        timingFieldsVersion: TIMING_FIELDS_VERSION,
        authMs: identity.authMs,
        deployCommit: identity.deployCommit,
        preGenerationTelemetryWriteMs,
        postGenerationTelemetryWriteMs,
      };
      if (generation !== null) {
        fields.preGenerationMs = generation.startedMs;
        fields.generationAgent = generation.agent;
        fields.preGenerationResidualMs = generation.residualMs;
      }
      return fields;
    },
    /**
     * Fields for terminal failure or cancellation events. Present only when
     * generation began, so the baseline is not biased toward turns that reached
     * reply_sent. Post-generation telemetry is deliberately omitted: those writes
     * have not all happened when these events are written, so a total would be
     * incomplete. The pre-generation values are complete at this point.
     */
    terminalTimingFields(): Record<string, number | string | null> {
      if (generation === null) return {};
      return {
        timingFieldsVersion: TIMING_FIELDS_VERSION,
        authMs: identity.authMs,
        deployCommit: identity.deployCommit,
        preGenerationMs: generation.startedMs,
        generationAgent: generation.agent,
        preGenerationTelemetryWriteMs,
        preGenerationResidualMs: generation.residualMs,
      };
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
