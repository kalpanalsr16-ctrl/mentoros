import { test } from "node:test";
import assert from "node:assert/strict";
import { toSpeechText, condenseForSpeech } from "@/lib/avatar/speech-text";

test("spells common fractions as words", () => {
  assert.equal(toSpeechText("Three fourths is 3/4."), "Three fourths is three fourths.");
  assert.equal(toSpeechText("Take 1/2 of it."), "Take one half of it.");
  assert.equal(toSpeechText("Try 2/3."), "Try two thirds.");
});

test("reads arithmetic symbols aloud", () => {
  assert.equal(toSpeechText("1/2 + 1/4 = 3/4"), "one half plus one fourth equals three fourths");
  assert.equal(toSpeechText("5 - 3 = 2"), "5 minus 3 equals 2");
  assert.equal(toSpeechText("2 × 3"), "2 times 3");
});

test("removes markdown and emoji but keeps the words", () => {
  assert.equal(toSpeechText("**Great** job! 😊 👀"), "Great job!");
  assert.equal(toSpeechText("- one\n- two"), "one\ntwo");
});

test("unwraps simple LaTeX", () => {
  assert.equal(toSpeechText("Use $\\frac{3}{4}$ here."), "Use three fourths here.");
});

test("keeps short answers whole", () => {
  const short = "Three fourths is 3/4. That means three equal parts out of four.";
  assert.equal(condenseForSpeech(toSpeechText(short)), toSpeechText(short));
});

test("condenses long answers to whole sentences within the spoken budget", () => {
  const sentence = "This is a sentence with exactly ten words in it here.";
  const long = Array.from({ length: 8 }, () => sentence).join(" ");
  const spoken = condenseForSpeech(long);
  assert.ok(spoken.split(/\s+/).length <= 60, "spoken text stays within roughly 20 seconds");
  assert.ok(spoken.endsWith("The full explanation is on your screen."));
  assert.ok(spoken.startsWith("This is a sentence"));
});

test("a single very long sentence is cut at the budget, not dropped", () => {
  const spoken = condenseForSpeech(Array.from({ length: 120 }, (_, i) => `w${i}`).join(" ") + ".");
  assert.ok(spoken.startsWith("w0 w1"));
  assert.ok(spoken.endsWith("The full explanation is on your screen."));
});
