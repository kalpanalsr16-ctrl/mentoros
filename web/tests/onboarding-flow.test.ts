import { test } from "node:test";
import assert from "node:assert/strict";
import { nextStep, isSkippable, buildProfilePatchBody, STEP_ORDER } from "@/lib/onboarding/onboarding-flow";

test("STEP_ORDER is Welcome, Grade, Goals, Style, Diagnostic in that order", () => {
  assert.deepEqual(STEP_ORDER, ["welcome", "grade", "goals", "style", "diagnostic"]);
});

test("nextStep walks the sequence and returns null past the end", () => {
  assert.equal(nextStep("welcome"), "grade");
  assert.equal(nextStep("grade"), "goals");
  assert.equal(nextStep("goals"), "style");
  assert.equal(nextStep("style"), "diagnostic");
  assert.equal(nextStep("diagnostic"), null);
});

test("Skip is offered starting at Grade (step 2), never on Welcome", () => {
  assert.equal(isSkippable("welcome"), false);
  assert.equal(isSkippable("grade"), true);
  assert.equal(isSkippable("goals"), true);
  assert.equal(isSkippable("style"), true);
  assert.equal(isSkippable("diagnostic"), true);
});

test("buildProfilePatchBody only includes fields the student actually answered", () => {
  assert.deepEqual(buildProfilePatchBody({ grade: [], goals: [], style: [] }), {});
  assert.deepEqual(buildProfilePatchBody({ grade: ["4"], goals: [], style: [] }), { grade: 4 });
  assert.deepEqual(buildProfilePatchBody({ grade: [], goals: ["BuildConfidence", "ForFun"], style: [] }), {
    learningGoals: ["BuildConfidence", "ForFun"],
  });
  assert.deepEqual(buildProfilePatchBody({ grade: ["7"], goals: ["CatchUp"], style: ["Visual"] }), {
    grade: 7,
    learningGoals: ["CatchUp"],
    preferredLearningStyle: "Visual",
  });
});

test("Skip (empty selections) still produces a valid, non-throwing PATCH body", () => {
  const body = buildProfilePatchBody({ grade: [], goals: [], style: [] });
  assert.doesNotThrow(() => JSON.stringify(body));
});
