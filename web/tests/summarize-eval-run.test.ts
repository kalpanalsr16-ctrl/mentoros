import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeEvalRun } from "@/lib/evaluation-analytics/summarize-eval-run";
import type { EvalRunItem } from "@/app/studio/evaluation/runs/EvalRunLiveView";

function item(overrides: Partial<EvalRunItem>): EvalRunItem {
  return {
    id: "1",
    golden_id: "g1",
    question: "Q",
    source_agent: "Concept",
    status: "pass",
    latency_ms: 1000,
    overall_score: 90,
    groundedness_score: 90,
    accuracy_score: 90,
    safety_score: 90,
    hallucination_risk: "Low",
    response_excerpt: null,
    error_message: null,
    ...overrides,
  };
}

test("counts pass/fail/error correctly", () => {
  const items = [item({ status: "pass" }), item({ status: "fail" }), item({ status: "error", overall_score: null })];
  const summary = summarizeEvalRun(items);
  assert.equal(summary.total, 3);
  assert.equal(summary.passed, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.errored, 1);
});

test("averages only pass/fail items, excluding errors with no scores", () => {
  const items = [
    item({ status: "pass", overall_score: 80 }),
    item({ status: "fail", overall_score: 40 }),
    item({ status: "error", overall_score: null, groundedness_score: null, accuracy_score: null, safety_score: null }),
  ];
  const summary = summarizeEvalRun(items);
  assert.equal(summary.avgOverallScore, 60);
});

test("empty run produces null averages, not zero or NaN", () => {
  const summary = summarizeEvalRun([]);
  assert.equal(summary.avgOverallScore, null);
  assert.equal(summary.avgGroundedness, null);
  assert.equal(summary.total, 0);
});
