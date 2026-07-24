import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio, meetsAA, colors } from "@/design-system/tokens";

// Acceptance criterion from docs/design-system/02-Technical-Design-Foundations.md
// §16: "every text/background token pairing... must resolve to >=4.5:1
// for body text, >=3:1 for large text." Named per the actual pairings
// used in globals.css / tokens.css / component CSS this sprint.

test("contrastRatio is symmetric and >= 1", () => {
  const ratio = contrastRatio(colors.ink.ink950, colors.ink.ink000);
  assert.ok(ratio >= 1);
  assert.equal(ratio, contrastRatio(colors.ink.ink000, colors.ink.ink950));
});

test("primary text on page background meets AA body text (light mode)", () => {
  assert.ok(meetsAA(colors.ink.ink950, colors.ink.ink050));
});

test("secondary text on surface meets AA body text (light mode)", () => {
  assert.ok(meetsAA(colors.ink.ink800, colors.ink.ink000));
});

test("primary brand interactive color on white meets AA body text", () => {
  assert.ok(meetsAA(colors.brand.indigo500, colors.ink.ink000));
});

test("dark-mode primary text (ink-050) on dark-mode page background meets AA", () => {
  assert.ok(meetsAA(colors.ink.ink050, "#0a0a0f"));
});

test("danger text on its own light background meets AA body text", () => {
  assert.ok(meetsAA(colors.semantic.danger600, colors.semantic.danger100));
});

test("safety text on its own light background meets AA body text", () => {
  assert.ok(meetsAA(colors.semantic.safety600, colors.semantic.safety100));
});

test("white text on primary brand button fill meets AA body text", () => {
  assert.ok(meetsAA(colors.ink.ink000, colors.brand.indigo500));
});

test("tertiary text is the one pairing allowed to be large-text-only (documents the real gap)", () => {
  // ink-400 (placeholder text) on white is intentionally lower contrast
  // than body text requires -- it's placeholder-only usage, per
  // docs/design-system/02-Technical-Design-Foundations.md §3.4. Asserted
  // explicitly so a future token change that silently breaks this
  // assumption fails a test, not a design review months later.
  assert.ok(!meetsAA(colors.ink.ink400, colors.ink.ink000));
});
