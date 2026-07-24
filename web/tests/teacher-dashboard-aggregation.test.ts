import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describeActivity,
  buildActivityFeed,
  type ActivityEventRow,
} from "@/lib/teacher-dashboard/teacher-dashboard-aggregation";

test("describeActivity uses conceptName when present for practice_generated", () => {
  const description = describeActivity("practice_generated", { conceptName: "Addition" });
  assert.equal(description, "practiced Addition");
});

test("describeActivity falls back to a generic phrase when conceptName is missing", () => {
  const description = describeActivity("practice_generated", {});
  assert.equal(description, "practiced a set of questions");
});

test("describeActivity uses conceptName for assessment_completed", () => {
  const description = describeActivity("assessment_completed", { conceptName: "Subtraction" });
  assert.equal(description, "completed an assessment on Subtraction");
});

test("describeActivity returns null for a non-activity-worthy event", () => {
  assert.equal(describeActivity("routing_failed", {}), null);
  assert.equal(describeActivity("llm_call_succeeded", {}), null);
});

function row(overrides: Partial<ActivityEventRow>): ActivityEventRow {
  return {
    id: "e1",
    eventName: "assessment_completed",
    payload: { conceptName: "Addition" },
    createdAt: "2026-07-01T00:00:00Z",
    studentName: "Jamie",
    ...overrides,
  };
}

test("buildActivityFeed maps activity-worthy rows and drops the rest", () => {
  const rows = [
    row({ id: "a", eventName: "assessment_completed" }),
    row({ id: "b", eventName: "routing_failed" }),
  ];
  const feed = buildActivityFeed(rows);
  assert.deepEqual(feed.map((i) => i.id), ["a"]);
  assert.equal(feed[0].studentName, "Jamie");
  assert.equal(feed[0].description, "completed an assessment on Addition");
});
