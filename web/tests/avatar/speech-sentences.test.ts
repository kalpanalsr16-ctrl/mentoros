import { test } from "node:test";
import assert from "node:assert/strict";
import { takeCompleteSentences, createSpeechStreamer, splitSpeechSentences } from "@/lib/avatar/speech-sentences";
import { estimatedSentenceMs, activeSentenceIndex } from "@/lib/avatar/speech-timing";

test("sentences end at punctuation followed by space, not inside decimals", () => {
  const { sentences, rest } = takeCompleteSentences("Use 0.75 here. Next one! Partial");
  assert.deepEqual(sentences, ["Use 0.75 here.", "Next one!"]);
  assert.equal(rest, "Partial");
});

test("streamed pieces produce the same sentences as the whole text", () => {
  const full = "First point is here. Second point follows.\n\nNew paragraph starts. End.";
  const whole = splitSpeechSentences(full).map((s) => s.text);

  const streamer = createSpeechStreamer();
  const streamed: string[] = [];
  for (const piece of full.match(/[\s\S]{1,7}/g) ?? []) streamed.push(...streamer.push(piece));
  streamed.push(...streamer.flush());

  assert.deepEqual(streamed, whole);
});

test("the streamer holds the newest sentence until the reply completes", () => {
  const streamer = createSpeechStreamer();
  assert.deepEqual(streamer.push("One sentence. "), []);
  assert.deepEqual(streamer.push("Two sentence. "), ["One sentence."]);
  assert.deepEqual(streamer.flush(), ["Two sentence."]);
});

test("paragraph index is recorded for each sentence", () => {
  const result = splitSpeechSentences("Para one. More.\n\nPara two.");
  assert.deepEqual(result.map((s) => s.paragraph), [0, 0, 1]);
});

test("estimated sentence time scales with length and has a floor", () => {
  assert.equal(estimatedSentenceMs("Hi"), 600);
  assert.ok(estimatedSentenceMs("one two three four five six seven eight nine ten") > 3000);
});

test("active sentence follows cumulative durations and holds the last one", () => {
  const durations = [1000, 2000, 1000];
  assert.equal(activeSentenceIndex(durations, 0), 0);
  assert.equal(activeSentenceIndex(durations, 1500), 1);
  assert.equal(activeSentenceIndex(durations, 3500), 2);
  assert.equal(activeSentenceIndex(durations, 9000), 2);
  assert.equal(activeSentenceIndex([], 100), null);
});
