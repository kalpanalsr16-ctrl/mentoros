import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createFirstContentTracker,
  isModelGeneratedReply,
  replyTimingFields,
} from "@/lib/chat/turn-timing";

function clock(...values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

test("first content is the first non-empty streamed text delta", () => {
  const tracker = createFirstContentTracker(clock(1200, 1500));
  tracker.recordTextDelta("");
  assert.equal(tracker.value(), null);
  tracker.recordTextDelta("Hello");
  tracker.recordTextDelta(" there");
  assert.equal(tracker.value(), 1200);
});

test("a later complete reply does not overwrite a streamed first-content time", () => {
  const tracker = createFirstContentTracker(clock(900));
  tracker.recordTextDelta("Hi");
  tracker.recordCompleteReply(5000);
  assert.equal(tracker.value(), 900);
});

test("a non-streamed model reply takes first content from its save time", () => {
  const tracker = createFirstContentTracker(clock(0));
  tracker.recordCompleteReply(17353);
  assert.equal(tracker.value(), 17353);
});

test("clarification, safety declines, and fallbacks never receive first content", () => {
  assert.equal(isModelGeneratedReply("text", { isClarification: true }), false);
  assert.equal(isModelGeneratedReply("safety_decline", {}), false);
  assert.equal(isModelGeneratedReply("text", { isFallbackReply: true }), false);
});

test("practice, assessment, concept, and streamed general replies are model output", () => {
  assert.equal(isModelGeneratedReply("practice", {}), true);
  assert.equal(isModelGeneratedReply("assessment", {}), true);
  assert.equal(isModelGeneratedReply("text", {}), true);
});

test("a turn whose Evaluation runs after the save carries no E1 wall-clock", () => {
  const fields = replyTimingFields({ replyCompletedMs: 17353, evaluationDeferred: true, firstContentMs: 17353 });
  assert.equal("wallClockMs" in fields, false);
  assert.equal(fields.replyCompletedMs, 17353);
  assert.equal(fields.firstContentMs, 17353);
});

test("a turn with no deferred Evaluation keeps wallClockMs equal to reply completion", () => {
  const fields = replyTimingFields({ replyCompletedMs: 4952, evaluationDeferred: false, firstContentMs: 1100 });
  assert.equal(fields.wallClockMs, 4952);
  assert.equal(fields.replyCompletedMs, 4952);
  assert.equal(fields.firstContentMs, 1100);
});

test("firstContentMs is omitted when no model output existed", () => {
  const fields = replyTimingFields({ replyCompletedMs: 3000, evaluationDeferred: false, firstContentMs: null });
  assert.equal("firstContentMs" in fields, false);
  assert.equal(fields.wallClockMs, 3000);
});

test("first content never comes after reply completion", () => {
  const tracker = createFirstContentTracker(clock(2500));
  tracker.recordTextDelta("a");
  const fields = replyTimingFields({ replyCompletedMs: 4000, evaluationDeferred: true, firstContentMs: tracker.value() });
  assert.ok((fields.firstContentMs as number) <= fields.replyCompletedMs);
});
