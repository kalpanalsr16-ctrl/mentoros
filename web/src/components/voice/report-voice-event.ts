export type ClientVoiceEventName =
  | "voice_recording_started"
  | "avatar_speaking_started"
  | "avatar_failed"
  | "voice_turn_timing";

export type AvatarTurnStatus = "spoke" | "not_spoken" | "unavailable" | "failed";

export type VoiceTurnReport = {
  voiceTraceId: string | null;
  questionEndToTranscriptMs: number;
  transcriptToReplyMs: number;
  replyToAvatarAudioMs?: number;
  replyStartToAvatarAudioMs?: number;
  totalMs?: number;
  avatarStatus: AvatarTurnStatus;
};

export function reportVoiceEvent(eventName: ClientVoiceEventName, payload?: Record<string, unknown>) {
  return fetch("/api/voice/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, payload }),
  }).catch(() => undefined);
}

export function reportVoiceTurn(report: VoiceTurnReport) {
  return reportVoiceEvent("voice_turn_timing", { ...report });
}
