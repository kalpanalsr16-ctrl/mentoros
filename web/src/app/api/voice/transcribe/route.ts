import { createClient } from "@/lib/supabase/server";
import { generateTraceId, logEvent } from "@/lib/observability/trace";
import { MAX_WAV_BYTES, MUSE_SAMPLE_RATE, readWavInfo } from "@/lib/voice/wav";
import { transcribeWithMuse } from "@/lib/voice/muse-transcribe";
import { transcribeLimiter } from "@/lib/security/voice-limits";

const ALLOWED_SAMPLE_RATES = [MUSE_SAMPLE_RATE, 24000];

/**
 * Push-to-talk transcription. The browser sends one completed WAV utterance;
 * the audio is forwarded to Muse and discarded. Nothing is stored, and the
 * transcript is returned to the browser to be submitted through /api/chat.
 */
export async function POST(request: Request) {
  const traceId = generateTraceId();
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in.", traceId }, { status: 401 });
  }
  const studentId = claimsData.claims.sub as string;

  const limit = transcribeLimiter.check(studentId);
  if (limit.limited) {
    await logEvent(supabase, {
      traceId,
      eventName: "voice_transcription_failed",
      studentId,
      payload: { reason: `rate_limited_${limit.reason}` },
    });
    return Response.json(
      { error: "Voice input is paused for a moment. You can keep typing.", traceId },
      { status: 429 },
    );
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0 || audio.size > MAX_WAV_BYTES) {
    await logEvent(supabase, {
      traceId,
      eventName: "voice_transcription_failed",
      studentId,
      payload: { reason: "invalid_audio" },
    });
    return Response.json({ error: "That recording couldn't be used. Please try again.", traceId }, { status: 400 });
  }

  const bytes = new Uint8Array(await audio.arrayBuffer());
  const info = readWavInfo(bytes);
  const validFormat =
    info !== null &&
    info.channels === 1 &&
    info.bitsPerSample === 16 &&
    ALLOWED_SAMPLE_RATES.includes(info.sampleRate);
  if (!info || !validFormat) {
    await logEvent(supabase, {
      traceId,
      eventName: "voice_transcription_failed",
      studentId,
      payload: { reason: "unsupported_audio_format" },
    });
    return Response.json({ error: "That recording couldn't be used. Please try again.", traceId }, { status: 400 });
  }

  const result = await transcribeWithMuse(audio, {
    apiKey: process.env.MODEL_API_KEY,
    sessionId: crypto.randomUUID(),
  });

  if (!result.ok) {
    await logEvent(supabase, {
      traceId,
      eventName: "voice_transcription_failed",
      studentId,
      payload: { reason: result.reason, latencyMs: result.latencyMs },
    });
    return Response.json(
      { error: "Voice input isn't available right now. You can type your question instead.", traceId },
      { status: 502 },
    );
  }

  await logEvent(supabase, {
    traceId,
    eventName: "voice_transcription_completed",
    studentId,
    payload: {
      audioSeconds: Math.round((info.dataBytes / (info.sampleRate * 2)) * 10) / 10,
      transcriptLength: result.transcript.length,
      latencyMs: result.latencyMs,
    },
  });

  return Response.json({ transcript: result.transcript, traceId });
}
