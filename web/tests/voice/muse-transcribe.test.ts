import { test } from "node:test";
import assert from "node:assert/strict";
import { transcribeWithMuse } from "@/lib/voice/muse-transcribe";

const wav = new Blob([new Uint8Array(64)], { type: "audio/wav" });

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

test("returns not_configured without calling Muse when the key is missing", async () => {
  let called = false;
  const result = await transcribeWithMuse(wav, {
    apiKey: undefined,
    sessionId: "s1",
    fetchImpl: async () => {
      called = true;
      return jsonResponse({});
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reason, "not_configured");
  assert.equal(called, false);
});

test("sends a bearer-authenticated multipart request and returns the transcript", async () => {
  let capturedUrl = "";
  let capturedAuth = "";
  let capturedRequestPart = "";
  const result = await transcribeWithMuse(wav, {
    apiKey: "test-key",
    sessionId: "abc-123",
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedAuth = (init?.headers as Record<string, string>).Authorization;
      const form = init?.body as FormData;
      capturedRequestPart = await (form.get("request") as Blob).text();
      return jsonResponse({ transcript: "  What is three fourths?  " });
    },
  });

  assert.equal(capturedUrl, "https://api.meta.ai/v1/asr/transcribe?sessionId=abc-123");
  assert.equal(capturedAuth, "Bearer test-key");
  assert.deepEqual(JSON.parse(capturedRequestPart), {
    mode: "PUSH_TO_TALK",
    model: "muse-voice-transcribe-1.0",
    audioEncoding: "WAV",
  });
  assert.equal(result.ok && result.transcript, "What is three fourths?");
});

test("maps an HTTP error to upstream_error", async () => {
  const result = await transcribeWithMuse(wav, {
    apiKey: "k",
    sessionId: "s",
    fetchImpl: async () => jsonResponse({ error: "nope" }, 500),
  });
  assert.equal(result.ok === false && result.reason, "upstream_error");
});

test("maps a network failure to upstream_error", async () => {
  const result = await transcribeWithMuse(wav, {
    apiKey: "k",
    sessionId: "s",
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
  });
  assert.equal(result.ok === false && result.reason, "upstream_error");
});

test("maps a timeout to timeout", async () => {
  const result = await transcribeWithMuse(wav, {
    apiKey: "k",
    sessionId: "s",
    fetchImpl: async () => {
      throw new DOMException("timed out", "TimeoutError");
    },
  });
  assert.equal(result.ok === false && result.reason, "timeout");
});

test("treats an empty transcript as a failure, not a message to send", async () => {
  const result = await transcribeWithMuse(wav, {
    apiKey: "k",
    sessionId: "s",
    fetchImpl: async () => jsonResponse({ transcript: "   " }),
  });
  assert.equal(result.ok === false && result.reason, "empty_transcript");
});
