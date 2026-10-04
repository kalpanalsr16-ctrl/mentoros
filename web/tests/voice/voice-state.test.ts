import { test } from "node:test";
import assert from "node:assert/strict";
import { nextVoiceState } from "@/lib/voice/voice-state";

test("push-to-talk follows IDLE -> RECORDING -> TRANSCRIBING -> SUBMITTING -> IDLE", () => {
  let state = nextVoiceState("IDLE", { type: "START" });
  assert.equal(state, "RECORDING");
  state = nextVoiceState(state, { type: "STOP" });
  assert.equal(state, "TRANSCRIBING");
  state = nextVoiceState(state, { type: "TRANSCRIBED" });
  assert.equal(state, "SUBMITTING");
  state = nextVoiceState(state, { type: "SUBMITTED" });
  assert.equal(state, "IDLE");
});

test("out-of-order events are ignored instead of corrupting state", () => {
  assert.equal(nextVoiceState("IDLE", { type: "STOP" }), "IDLE");
  assert.equal(nextVoiceState("RECORDING", { type: "START" }), "RECORDING");
  assert.equal(nextVoiceState("TRANSCRIBING", { type: "CANCEL" }), "TRANSCRIBING");
});

test("cancel and failure always return to IDLE from the states they apply to", () => {
  assert.equal(nextVoiceState("RECORDING", { type: "CANCEL" }), "IDLE");
  assert.equal(nextVoiceState("TRANSCRIBING", { type: "FAILED" }), "IDLE");
});
