import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveShellForRole, ROLE_SHELL_PATH } from "@/lib/auth/resolve-shell";

test("student role resolves to /app", () => {
  assert.equal(resolveShellForRole("student"), "/app");
});

test("teacher role resolves to /studio", () => {
  assert.equal(resolveShellForRole("teacher"), "/studio");
});

test("parent role resolves to /parent", () => {
  assert.equal(resolveShellForRole("parent"), "/parent");
});

test("unknown/legacy role value fails toward the narrowest experience (student)", () => {
  assert.equal(resolveShellForRole("admin"), "/app");
  assert.equal(resolveShellForRole(""), "/app");
  assert.equal(resolveShellForRole("STUDENT"), "/app"); // case-sensitive, deliberately not normalized
});

test("ROLE_SHELL_PATH covers exactly the three roles the profiles.role migration allows", () => {
  assert.deepEqual(Object.keys(ROLE_SHELL_PATH).sort(), ["parent", "student", "teacher"]);
});
