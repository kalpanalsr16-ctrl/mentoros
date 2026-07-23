import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mapPracticeDifficultyToLevel,
  buildHomeworkLearningPlan,
  buildHomeworkPersonalizationProfile,
} from "@/lib/teacher-homework/homework-context";

test("mapPracticeDifficultyToLevel maps Practice Agent's 5-level scale down to Planning's 3-level scale", () => {
  assert.equal(mapPracticeDifficultyToLevel("Beginner"), "Beginner");
  assert.equal(mapPracticeDifficultyToLevel("Easy"), "Beginner");
  assert.equal(mapPracticeDifficultyToLevel("Medium"), "Intermediate");
  assert.equal(mapPracticeDifficultyToLevel("Advanced"), "Advanced");
  assert.equal(mapPracticeDifficultyToLevel("Challenge"), "Advanced");
});

test("buildHomeworkLearningPlan always uses PracticeFirst strategy and marks no live follow-up", () => {
  const plan = buildHomeworkLearningPlan("Medium");
  assert.equal(plan.strategy, "PracticeFirst");
  assert.equal(plan.difficulty, "Intermediate");
  assert.equal(plan.followUpRequired, false);
});

test("buildHomeworkPersonalizationProfile uses the low-confidence branch for a low-confidence student", () => {
  const profile = buildHomeworkPersonalizationProfile({ confidence: "Low", preferredLearningStyle: "Visual" }, "Medium");
  assert.equal(profile.teachingStyle, "Visual");
  assert.equal(profile.pace, "Slow");
  assert.equal(profile.encouragement, "High");
});

test("buildHomeworkPersonalizationProfile uses the student's preferred style when confidence isn't low", () => {
  const profile = buildHomeworkPersonalizationProfile({ confidence: "High", preferredLearningStyle: "ExampleFirst" }, "Advanced");
  assert.equal(profile.teachingStyle, "ExampleFirst");
  assert.equal(profile.difficulty, "Advanced");
  assert.equal(profile.pace, "Medium");
});

test("buildHomeworkPersonalizationProfile falls back to a standard default for a class-wide (null) target", () => {
  const profile = buildHomeworkPersonalizationProfile(null, "Beginner");
  assert.equal(profile.teachingStyle, "StepByStep");
  assert.equal(profile.encouragement, "Medium");
});

test("buildHomeworkPersonalizationProfile falls back to the standard default when a targeted student has no profile fields", () => {
  const profile = buildHomeworkPersonalizationProfile({}, "Medium");
  assert.equal(profile.teachingStyle, "StepByStep");
});
