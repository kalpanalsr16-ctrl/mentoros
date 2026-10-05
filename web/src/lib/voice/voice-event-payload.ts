/**
 * Whitelists and rebuilds the payload of each browser-reported voice event.
 * Only identifiers and numbers survive; no audio, transcript, or video data.
 * Lives outside the route so it can be unit-tested without the request context.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONVERSATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const MAX_LATENCY_MS = 10 * 60 * 1000;
const AVATAR_STATUSES = ["spoke", "not_spoken", "unavailable", "failed"];
const FAILURE_STAGES = ["join", "speak"];

export function sanitizePayload(eventName: string, raw: unknown): Record<string, unknown> | null {
  const input = (raw ?? {}) as Record<string, unknown>;

  switch (eventName) {
    case "voice_recording_started":
      return {};
    case "avatar_speaking_started":
      return {
        voiceTraceId: uuidOrNull(input.voiceTraceId),
        conversationId: conversationIdOrNull(input.conversationId),
        inferenceId: uuidOrNull(input.inferenceId),
      };
    case "avatar_failed":
      return FAILURE_STAGES.includes(input.stage as string) ? { stage: input.stage } : null;
    case "voice_turn_timing": {
      if (!AVATAR_STATUSES.includes(input.avatarStatus as string)) return null;
      const payload: Record<string, unknown> = {
        voiceTraceId: uuidOrNull(input.voiceTraceId),
        avatarStatus: input.avatarStatus,
        questionEndToTranscriptMs: latency(input.questionEndToTranscriptMs),
        transcriptToReplyMs: latency(input.transcriptToReplyMs),
      };
      if (input.replyToAvatarAudioMs !== undefined) payload.replyToAvatarAudioMs = latency(input.replyToAvatarAudioMs);
      if (input.replyStartToAvatarAudioMs !== undefined) {
        payload.replyStartToAvatarAudioMs = latency(input.replyStartToAvatarAudioMs);
      }
      if (input.totalMs !== undefined) payload.totalMs = latency(input.totalMs);
      return payload;
    }
    default:
      return null;
  }
}

function uuidOrNull(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function conversationIdOrNull(value: unknown): string | null {
  return typeof value === "string" && CONVERSATION_ID_PATTERN.test(value) ? value : null;
}

function latency(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_LATENCY_MS
    ? Math.round(value)
    : null;
}
