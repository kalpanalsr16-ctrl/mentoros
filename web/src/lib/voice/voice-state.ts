export type VoiceState = "IDLE" | "RECORDING" | "TRANSCRIBING" | "SUBMITTING";

export type VoiceEvent =
  | { type: "START" }
  | { type: "STOP" }
  | { type: "CANCEL" }
  | { type: "TRANSCRIBED" }
  | { type: "SUBMITTED" }
  | { type: "FAILED" };

/**
 * Push-to-talk lifecycle. Any event that doesn't apply to the current state
 * is ignored, so a double-tap or a late callback can't put the control in an
 * impossible state.
 */
export function nextVoiceState(state: VoiceState, event: VoiceEvent): VoiceState {
  switch (event.type) {
    case "START":
      return state === "IDLE" ? "RECORDING" : state;
    case "STOP":
      return state === "RECORDING" ? "TRANSCRIBING" : state;
    case "CANCEL":
      return state === "RECORDING" ? "IDLE" : state;
    case "TRANSCRIBED":
      return state === "TRANSCRIBING" ? "SUBMITTING" : state;
    case "SUBMITTED":
      return state === "SUBMITTING" ? "IDLE" : state;
    case "FAILED":
      return "IDLE";
  }
}
