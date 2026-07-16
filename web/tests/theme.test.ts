import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveTheme } from "@/design-system/hooks/resolve-theme";

test("explicit light preference always resolves to light, regardless of system", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("light", false), "light");
});

test("explicit dark preference always resolves to dark, regardless of system", () => {
  assert.equal(resolveTheme("dark", true), "dark");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("system preference follows the OS setting", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
});
