const MUSE_TRANSCRIBE_URL = "https://api.meta.ai/v1/asr/transcribe";
const MUSE_MODEL = "muse-voice-transcribe-1.0";
const DEFAULT_TIMEOUT_MS = 20000;

export type MuseTranscribeResult =
  | { ok: true; transcript: string; latencyMs: number }
  | { ok: false; reason: "not_configured" | "timeout" | "upstream_error" | "empty_transcript"; latencyMs: number };

type FetchLike = typeof fetch;

/**
 * Provider boundary for Meta Muse push-to-talk transcription. Callers only
 * see a transcript or a coarse failure reason; the audio never leaves this
 * function except as the outbound request body.
 */
export async function transcribeWithMuse(
  wav: Blob,
  options: { apiKey: string | undefined; sessionId: string; fetchImpl?: FetchLike; timeoutMs?: number },
): Promise<MuseTranscribeResult> {
  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;

  if (!options.apiKey) return { ok: false, reason: "not_configured", latencyMs: 0 };

  const form = new FormData();
  form.append(
    "request",
    new Blob(
      [JSON.stringify({ mode: "PUSH_TO_TALK", model: MUSE_MODEL, audioEncoding: "WAV" })],
      { type: "application/json" },
    ),
    "request.json",
  );
  form.append("audio", wav, "utterance.wav");

  const url = `${MUSE_TRANSCRIBE_URL}?sessionId=${encodeURIComponent(options.sessionId)}`;
  const fetchImpl = options.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${options.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return { ok: false, reason: timedOut ? "timeout" : "upstream_error", latencyMs: elapsed() };
  }

  if (!response.ok) return { ok: false, reason: "upstream_error", latencyMs: elapsed() };

  const body = (await response.json().catch(() => null)) as { transcript?: unknown } | null;
  const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript) return { ok: false, reason: "empty_transcript", latencyMs: elapsed() };

  return { ok: true, transcript, latencyMs: elapsed() };
}
