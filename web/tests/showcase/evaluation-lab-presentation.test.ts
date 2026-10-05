import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatUtc,
  qualityOutcomeLabel,
  routingOutcomeLabel,
  runStatusLabel,
} from "@/lib/evaluation-lab/evaluation-lab-presentation";

test("routing outcomes use the shared Passed / Failed / Errored / Not run vocabulary", () => {
  assert.equal(routingOutcomeLabel("pass"), "Passed");
  assert.equal(routingOutcomeLabel("fail"), "Failed");
  assert.equal(routingOutcomeLabel("errored"), "Errored");
  assert.equal(routingOutcomeLabel("not_run"), "Not run");
});

test("quality outcomes map stored status to the same vocabulary", () => {
  assert.equal(qualityOutcomeLabel("pass"), "Passed");
  assert.equal(qualityOutcomeLabel("fail"), "Failed");
  assert.equal(qualityOutcomeLabel("error"), "Errored");
  assert.equal(qualityOutcomeLabel("pending"), "Not run");
  assert.equal(qualityOutcomeLabel("running"), "Not run");
});

test("an execution error is never presented as a failed evaluation", () => {
  assert.equal(qualityOutcomeLabel("error"), "Errored");
  assert.notEqual(qualityOutcomeLabel("error"), "Failed");
  assert.equal(routingOutcomeLabel("errored"), "Errored");
});

test("run status is labelled as run state, not as an evaluation outcome", () => {
  assert.equal(runStatusLabel("completed"), "Completed");
  assert.equal(runStatusLabel("running"), "In progress");
  assert.equal(runStatusLabel("weird"), "Unknown");
});

test("timestamps render in UTC regardless of the executing environment's timezone", () => {
  assert.equal(formatUtc("2026-10-05T13:41:36.423379+00:00"), "Oct 5, 2026, 1:41 PM UTC");
  assert.equal(formatUtc("2026-10-05T23:30:00Z"), "Oct 5, 2026, 11:30 PM UTC");
});
