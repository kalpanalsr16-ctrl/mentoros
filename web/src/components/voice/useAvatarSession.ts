"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DailyCall } from "@daily-co/daily-js";
import type { VoiceTurnTiming } from "@/lib/chat/types";
import { reportVoiceEvent, reportVoiceTurn, type AvatarTurnStatus, type VoiceTurnReport } from "./report-voice-event";

export type AvatarStatus = "idle" | "starting" | "ready" | "failed";

/** A voice turn waiting for Dr. Paws's first audio, with its client-clock marks. */
export type PendingVoiceTurn = VoiceTurnTiming & { replyDoneAt: number };

const IDLE_END_MS = 5 * 60 * 1000;

type ActiveSession = { conversationId: string; call: DailyCall; idleTimer: ReturnType<typeof setTimeout> | null };

/**
 * Dr. Paws, driven purely as a renderer. MentorOS produces the text; this
 * hook only joins the Tavus room (receive-only, no mic or camera) and sends
 * the spoken text as conversation.echo. Every failure leaves status "failed"
 * and never throws into the chat flow.
 */
export function useAvatarSession() {
  const [status, setStatus] = useState<AvatarStatus>("idle");
  const [speaking, setSpeaking] = useState(false);
  const sessionRef = useRef<ActiveSession | null>(null);
  const startingRef = useRef<Promise<boolean> | null>(null);
  const pendingTurnRef = useRef<PendingVoiceTurn | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);

  const videoRef = useCallback((element: HTMLVideoElement | null) => {
    videoElRef.current = element;
    if (element && mediaRef.current) element.srcObject = mediaRef.current;
  }, []);

  const clearIdleTimer = useCallback(() => {
    const session = sessionRef.current;
    if (session?.idleTimer) clearTimeout(session.idleTimer);
    if (session) session.idleTimer = null;
  }, []);

  const end = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) {
      setStatus("idle");
      return;
    }
    clearIdleTimer();
    sessionRef.current = null;
    mediaRef.current = null;
    pendingTurnRef.current = null;
    if (videoElRef.current) videoElRef.current.srcObject = null;

    setSpeaking(false);
    setStatus("idle");
    try {
      await session.call.leave();
      session.call.destroy();
    } catch {
      // The conversation is ended server-side below regardless of client teardown.
    }
    await fetch("/api/avatar/session", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: session.conversationId }),
      keepalive: true,
    }).catch(() => undefined);
  }, [clearIdleTimer]);

  const armIdleTimer = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    clearIdleTimer();
    session.idleTimer = setTimeout(() => void end(), IDLE_END_MS);
  }, [clearIdleTimer, end]);

  const start = useCallback((): Promise<boolean> => {
    if (sessionRef.current) return Promise.resolve(true);
    if (startingRef.current) return startingRef.current;

    setStatus("starting");
    const attempt = (async () => {
      let conversationId: string | null = null;
      try {
        const response = await fetch("/api/avatar/session", { method: "POST" });
        if (!response.ok) throw new Error("avatar_unavailable");
        const created = (await response.json()) as { conversationId: string; conversationUrl: string };
        conversationId = created.conversationId;

        const { default: DailyIframe } = await import("@daily-co/daily-js");
        const call = DailyIframe.createCallObject({ audioSource: false, videoSource: false });

        call.on("track-started", (event) => {
          if (!event?.track || event.participant?.local) return;
          const media = mediaRef.current ?? new MediaStream();
          mediaRef.current = media;
          media.addTrack(event.track);
          if (videoElRef.current) videoElRef.current.srcObject = media;
        });

        call.on("app-message", (event) => {
          const eventType = (event?.data as { event_type?: string } | undefined)?.event_type;
          if (eventType === "conversation.replica.started_speaking") {
            setSpeaking(true);
            const turn = pendingTurnRef.current;
            pendingTurnRef.current = null;
            if (turn) {
              const firstAudioAt = Date.now();
              void reportVoiceEvent("avatar_speaking_started");
              void reportVoiceTurn(buildReport(turn, "spoke", firstAudioAt));
            }
          } else if (eventType === "conversation.replica.stopped_speaking") {
            setSpeaking(false);
          }
        });

        await call.join({ url: created.conversationUrl });
        sessionRef.current = { conversationId: created.conversationId, call, idleTimer: null };
        setStatus("ready");
        armIdleTimer();
        return true;
      } catch {
        if (conversationId) {
          await fetch("/api/avatar/session", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId }),
          }).catch(() => undefined);
        }
        void reportVoiceEvent("avatar_failed", { stage: "join" });
        setStatus("failed");
        return false;
      } finally {
        startingRef.current = null;
      }
    })();

    startingRef.current = attempt;
    return attempt;
  }, [armIdleTimer]);

  /**
   * Sends the spoken text to Dr. Paws. Returns false (never throws) when no
   * live session exists; the caller then reports the turn as unavailable.
   */
  const speak = useCallback(
    (text: string, turn: PendingVoiceTurn): boolean => {
      const session = sessionRef.current;
      if (!session) return false;
      try {
        pendingTurnRef.current = turn;
        session.call.sendAppMessage(
          {
            message_type: "conversation",
            event_type: "conversation.echo",
            conversation_id: session.conversationId,
            properties: { modality: "text", text, inference_id: crypto.randomUUID(), done: true },
          },
          "*",
        );
      } catch {
        pendingTurnRef.current = null;
        void reportVoiceEvent("avatar_failed", { stage: "speak" });
        void reportVoiceTurn(buildReport(turn, "failed"));
        setStatus("failed");
        return false;
      }
      armIdleTimer();
      return true;
    },
    [armIdleTimer],
  );

  useEffect(() => {
    function handlePageHide() {
      const session = sessionRef.current;
      if (!session) return;
      void fetch("/api/avatar/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: session.conversationId }),
        keepalive: true,
      }).catch(() => undefined);
    }
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      void end();
    };
  }, [end]);

  return { status, speaking, videoRef, start, speak, end };
}

/** Reports a voice turn that Dr. Paws did not speak (not a text answer, or no session). */
export function reportUnspokenVoiceTurn(turn: PendingVoiceTurn, avatarStatus: Extract<AvatarTurnStatus, "not_spoken" | "unavailable">) {
  return reportVoiceTurn(buildReport(turn, avatarStatus));
}

function buildReport(turn: PendingVoiceTurn, avatarStatus: AvatarTurnStatus, firstAudioAt?: number): VoiceTurnReport {
  const report: VoiceTurnReport = {
    voiceTraceId: turn.voiceTraceId,
    questionEndToTranscriptMs: turn.transcriptReadyAt - turn.questionEndAt,
    transcriptToReplyMs: turn.replyDoneAt - turn.transcriptReadyAt,
    avatarStatus,
  };
  if (firstAudioAt !== undefined) {
    report.replyToAvatarAudioMs = firstAudioAt - turn.replyDoneAt;
    report.totalMs = firstAudioAt - turn.questionEndAt;
  }
  return report;
}
