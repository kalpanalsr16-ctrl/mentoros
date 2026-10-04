import { createClient } from "@/lib/supabase/server";
import { generateTraceId, logEvent } from "@/lib/observability/trace";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LATENCY_MS = 10 * 60 * 1000;
const AVATAR_STATUSES = ["spoke", "not_spoken", "unavailable", "failed"];
const FAILURE_STAGES = ["join", "speak"];

/**
 * Lifecycle events only the browser can observe. Each event is whitelisted
 * and its payload rebuilt field by field, so this route can't be used to
 * write arbitrary audit rows. Carries no audio, transcript, or video data.
 */
export async function POST(request: Request) {
  const traceId = generateTraceId();
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const studentId = claimsData.claims.sub as string;

  const body = await request.json().catch(() => null);
  const eventName = typeof body?.eventName === "string" ? body.eventName : "";
  const payload = sanitizePayload(eventName, body?.payload);
  if (!payload) {
    return Response.json({ error: "Unknown event." }, { status: 400 });
  }

  await logEvent(supabase, { traceId, eventName, studentId, payload });
  return Response.json({ ok: true });
}

function sanitizePayload(eventName: string, raw: unknown): Record<string, unknown> | null {
  const input = (raw ?? {}) as Record<string, unknown>;

  switch (eventName) {
    case "voice_recording_started":
    case "avatar_speaking_started":
      return {};
    case "avatar_failed":
      return FAILURE_STAGES.includes(input.stage as string) ? { stage: input.stage } : null;
    case "voice_turn_timing": {
      if (!AVATAR_STATUSES.includes(input.avatarStatus as string)) return null;
      const voiceTraceId =
        typeof input.voiceTraceId === "string" && UUID_PATTERN.test(input.voiceTraceId) ? input.voiceTraceId : null;
      const payload: Record<string, unknown> = {
        voiceTraceId,
        avatarStatus: input.avatarStatus,
        questionEndToTranscriptMs: latency(input.questionEndToTranscriptMs),
        transcriptToReplyMs: latency(input.transcriptToReplyMs),
      };
      if (input.replyToAvatarAudioMs !== undefined) payload.replyToAvatarAudioMs = latency(input.replyToAvatarAudioMs);
      if (input.totalMs !== undefined) payload.totalMs = latency(input.totalMs);
      return payload;
    }
    default:
      return null;
  }
}

function latency(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_LATENCY_MS
    ? Math.round(value)
    : null;
}
