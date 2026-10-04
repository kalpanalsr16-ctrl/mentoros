"use client";

import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/design-system/primitives/Button";
import { isVoiceInputSupported, useVoiceRecorder } from "./useVoiceRecorder";
import { reportVoiceEvent } from "./report-voice-event";
import { nextVoiceState, type VoiceState } from "@/lib/voice/voice-state";
import type { VoiceTurnTiming } from "@/lib/chat/types";
import styles from "./MicButton.module.css";

function subscribeNever() {
  return () => undefined;
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Push-to-talk control: tap to start, tap to finish. Renders nothing where
 * audio capture isn't available, so typed chat is the only path there and
 * nothing else changes. Any failure leaves the student able to type.
 */
export function MicButton({
  disabled = false,
  onRecordingStart,
  onTranscript,
}: {
  disabled?: boolean;
  onRecordingStart?: () => void;
  onTranscript: (transcript: string, voice: VoiceTurnTiming) => void;
}) {
  const [state, dispatch] = useReducer(nextVoiceState, "IDLE" as VoiceState);
  const supported = useSyncExternalStore(subscribeNever, isVoiceInputSupported, () => false);
  const [message, setMessage] = useState<string | null>(null);

  const stopRef = useRef<() => void>(() => undefined);
  const recorder = useVoiceRecorder({ onAutoStop: () => stopRef.current() });

  async function handleStart() {
    setMessage(null);
    try {
      await recorder.start();
    } catch (err) {
      const denied = err instanceof DOMException && err.name === "NotAllowedError";
      setMessage(denied ? "Microphone is off. You can keep typing." : "Voice input couldn't start. You can keep typing.");
      return;
    }
    dispatch({ type: "START" });
    onRecordingStart?.();
    void reportVoiceEvent("voice_recording_started");
  }

  async function handleStop() {
    const questionEndAt = Date.now();
    dispatch({ type: "STOP" });
    const wav = await recorder.stop();
    if (!wav) {
      dispatch({ type: "FAILED" });
      setMessage("I didn't hear anything. Try again.");
      return;
    }

    const form = new FormData();
    form.append("audio", wav, "question.wav");

    try {
      const response = await fetch("/api/voice/transcribe", { method: "POST", body: form });
      const body = (await response.json().catch(() => null)) as
        | { transcript?: string; traceId?: string; error?: string }
        | null;

      if (!response.ok || !body?.transcript) {
        dispatch({ type: "FAILED" });
        setMessage(body?.error ?? "Voice input isn't available right now. You can type your question instead.");
        return;
      }

      dispatch({ type: "TRANSCRIBED" });
      onTranscript(body.transcript, {
        voiceTraceId: body.traceId ?? null,
        questionEndAt,
        transcriptReadyAt: Date.now(),
      });
      dispatch({ type: "SUBMITTED" });
    } catch {
      dispatch({ type: "FAILED" });
      setMessage("Voice input isn't available right now. You can type your question instead.");
    }
  }

  useEffect(() => {
    stopRef.current = () => {
      if (state === "RECORDING") void handleStop();
    };
  });

  function handleCancel() {
    recorder.cancel();
    dispatch({ type: "CANCEL" });
  }

  if (!supported) return null;

  const recording = state === "RECORDING";
  const busy = state === "TRANSCRIBING" || state === "SUBMITTING";

  return (
    <div className={styles.wrap}>
      {recording && (
        <Button type="button" variant="secondary" onClick={handleCancel} className={styles.button}>
          Cancel
        </Button>
      )}
      <button
        type="button"
        onClick={() => (recording ? void handleStop() : void handleStart())}
        disabled={disabled || busy}
        aria-pressed={recording}
        aria-label={recording ? "Stop recording" : "Ask by voice"}
        className={recording ? styles.recording : styles.idle}
      >
        {recording ? <span aria-hidden="true" className={styles.dot} /> : <MicIcon />}
        {recording ? "Listening… tap to finish" : busy ? "Transcribing…" : null}
      </button>
      {message && (
        <p role="status" className={styles.message}>
          {message}
        </p>
      )}
    </div>
  );
}
