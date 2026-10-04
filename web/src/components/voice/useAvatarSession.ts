"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DailyCall } from "@daily-co/daily-js";
import type { VoiceTurnTiming } from "@/lib/chat/types";
import { toSpeechText } from "@/lib/avatar/speech-text";
import { activeSentenceIndex, estimatedSentenceMs } from "@/lib/avatar/speech-timing";
import { reportVoiceEvent, reportVoiceTurn, type VoiceTurnReport } from "./report-voice-event";

export type AvatarStatus = "idle" | "starting" | "ready" | "failed";

const IDLE_END_MS = 5 * 60 * 1000;
const HIGHLIGHT_TICK_MS = 200;

type ActiveSession = { conversationId: string; call: DailyCall; idleTimer: ReturnType<typeof setTimeout> | null };

/** One voice question's spoken reply: sentences sent so far, and the marks for latency reporting. */
type SpokenTurn = {
  timing: VoiceTurnTiming;
  inferenceId: string;
  replyStartAt: number;
  replyDoneAt: number | null;
  durationsMs: number[];
  speechStartedAt: number | null;
  firstAudioAt: number | null;
  reported: boolean;
};

/**
 * Dr. Paws, driven purely as a renderer. MentorOS produces the text; this
 * hook joins the Tavus room (receive-only, no mic or camera) and sends the
 * spoken sentences as conversation.echo. It also tracks which sentence is
 * being spoken so the chat can highlight it. Every failure leaves status
 * "failed" and never throws into the chat flow.
 */
export function useAvatarSession() {
  const [status, setStatus] = useState<AvatarStatus>("idle");
  const [speaking, setSpeaking] = useState(false);
  const [activeSentence, setActiveSentence] = useState<number | null>(null);
  const sessionRef = useRef<ActiveSession | null>(null);
  const startingRef = useRef<Promise<boolean> | null>(null);
  const turnRef = useRef<SpokenTurn | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);

  const videoRef = useCallback((element: HTMLVideoElement | null) => {
    videoElRef.current = element;
    if (element && mediaRef.current) element.srcObject = mediaRef.current;
  }, []);

  const stopHighlight = useCallback(() => {
    if (highlightTimerRef.current) clearInterval(highlightTimerRef.current);
    highlightTimerRef.current = null;
    setActiveSentence(null);
  }, []);

  const clearIdleTimer = useCallback(() => {
    const session = sessionRef.current;
    if (session?.idleTimer) clearTimeout(session.idleTimer);
    if (session) session.idleTimer = null;
  }, []);

  const end = useCallback(async () => {
    const session = sessionRef.current;
    stopHighlight();
    turnRef.current = null;
    if (!session) {
      setStatus("idle");
      return;
    }
    clearIdleTimer();
    sessionRef.current = null;
    mediaRef.current = null;
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
  }, [clearIdleTimer, stopHighlight]);

  const armIdleTimer = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    clearIdleTimer();
    session.idleTimer = setTimeout(() => void end(), IDLE_END_MS);
  }, [clearIdleTimer, end]);

  const maybeReport = useCallback(() => {
    const turn = turnRef.current;
    if (!turn || turn.reported || turn.speechStartedAt === null || turn.replyDoneAt === null) return;
    turn.reported = true;
    const { timing } = turn;
    const report: VoiceTurnReport = {
      voiceTraceId: timing.voiceTraceId,
      questionEndToTranscriptMs: timing.transcriptReadyAt - timing.questionEndAt,
      transcriptToReplyMs: turn.replyDoneAt - timing.transcriptReadyAt,
      replyStartToAvatarAudioMs: turn.speechStartedAt - turn.replyStartAt,
      replyToAvatarAudioMs: turn.speechStartedAt - turn.replyDoneAt,
      totalMs: (turn.firstAudioAt ?? turn.speechStartedAt) - timing.questionEndAt,
      avatarStatus: "spoke",
    };
    void reportVoiceTurn(report);
  }, []);

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
            const turn = turnRef.current;
            if (turn && turn.speechStartedAt === null) {
              const now = Date.now();
              turn.speechStartedAt = now;
              turn.firstAudioAt = now;
              void reportVoiceEvent("avatar_speaking_started");
              maybeReport();
              if (!highlightTimerRef.current) {
                highlightTimerRef.current = setInterval(() => {
                  const current = turnRef.current;
                  if (!current || current.speechStartedAt === null) return;
                  setActiveSentence(activeSentenceIndex(current.durationsMs, Date.now() - current.speechStartedAt));
                }, HIGHLIGHT_TICK_MS);
              }
            }
          } else if (eventType === "conversation.replica.stopped_speaking") {
            setSpeaking(false);
            stopHighlight();
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
  }, [armIdleTimer, maybeReport, stopHighlight]);

  /** Starts a new spoken reply for one voice question. Returns false if Dr. Paws isn't connected. */
  const beginTurn = useCallback((timing: VoiceTurnTiming): boolean => {
    if (!sessionRef.current) return false;
    stopHighlight();
    turnRef.current = {
      timing,
      inferenceId: crypto.randomUUID(),
      replyStartAt: Date.now(),
      replyDoneAt: null,
      durationsMs: [],
      speechStartedAt: null,
      firstAudioAt: null,
      reported: false,
    };
    return true;
  }, [stopHighlight]);

  /**
   * Sends sentences in order as one utterance. `done` marks the final
   * sentence, so Tavus knows the reply is complete. Sentence N in this turn
   * is highlighted as N in the chat.
   */
  const sendSentences = useCallback((sentences: string[], done: boolean): boolean => {
    const session = sessionRef.current;
    const turn = turnRef.current;
    if (!session || !turn) return false;
    try {
      sentences.forEach((sentence, index) => {
        const text = toSpeechText(sentence) || ".";
        turn.durationsMs.push(estimatedSentenceMs(text));
        session.call.sendAppMessage(
          {
            message_type: "conversation",
            event_type: "conversation.echo",
            conversation_id: session.conversationId,
            properties: {
              modality: "text",
              text: `${text} `,
              inference_id: turn.inferenceId,
              done: done && index === sentences.length - 1,
            },
          },
          "*",
        );
      });
    } catch {
      turnRef.current = null;
      void reportVoiceEvent("avatar_failed", { stage: "speak" });
      void reportVoiceTurn({
        voiceTraceId: turn.timing.voiceTraceId,
        questionEndToTranscriptMs: turn.timing.transcriptReadyAt - turn.timing.questionEndAt,
        transcriptToReplyMs: Date.now() - turn.timing.transcriptReadyAt,
        avatarStatus: "failed",
      });
      setStatus("failed");
      return false;
    }
    armIdleTimer();
    return true;
  }, [armIdleTimer]);

  /** Called when the chat reply finishes, whether or not Dr. Paws has started speaking yet. */
  const markReplyDone = useCallback(() => {
    const turn = turnRef.current;
    if (!turn) return;
    turn.replyDoneAt = Date.now();
    maybeReport();
  }, [maybeReport]);

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

  return {
    status,
    speaking,
    activeSentence,
    videoRef,
    start,
    beginTurn,
    sendSentences,
    markReplyDone,
    end,
    reportUnspoken: (timing: VoiceTurnTiming, avatarStatus: "not_spoken" | "unavailable") =>
      reportVoiceTurn({
        voiceTraceId: timing.voiceTraceId,
        questionEndToTranscriptMs: timing.transcriptReadyAt - timing.questionEndAt,
        transcriptToReplyMs: Date.now() - timing.transcriptReadyAt,
        avatarStatus,
      }),
  };
}
