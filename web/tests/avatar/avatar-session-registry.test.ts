import { test } from "node:test";
import assert from "node:assert/strict";
import { createAvatarSessionRegistry } from "@/lib/avatar/avatar-session-registry";

test("only the student who opened a session can act on it", () => {
  const registry = createAvatarSessionRegistry(() => 0);
  registry.register("conv-1", "student-a");
  assert.equal(registry.isOwnedBy("conv-1", "student-a"), true);
  assert.equal(registry.isOwnedBy("conv-1", "student-b"), false);
  assert.equal(registry.isOwnedBy("unknown", "student-a"), false);
});

test("sessions expire from the registry after the TTL", () => {
  let now = 0;
  const registry = createAvatarSessionRegistry(() => now);
  registry.register("conv-1", "student-a");
  now = 31 * 60 * 1000;
  assert.equal(registry.isOwnedBy("conv-1", "student-a"), false);
});

test("takeAllFor returns and forgets only that student's sessions", () => {
  const registry = createAvatarSessionRegistry(() => 0);
  registry.register("conv-1", "student-a");
  registry.register("conv-2", "student-a");
  registry.register("conv-3", "student-b");
  assert.deepEqual(registry.takeAllFor("student-a").sort(), ["conv-1", "conv-2"]);
  assert.equal(registry.isOwnedBy("conv-1", "student-a"), false);
  assert.equal(registry.isOwnedBy("conv-3", "student-b"), true);
});

test("remove forgets a session immediately", () => {
  const registry = createAvatarSessionRegistry(() => 0);
  registry.register("conv-1", "student-a");
  registry.remove("conv-1");
  assert.equal(registry.isOwnedBy("conv-1", "student-a"), false);
});
