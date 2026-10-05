import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLabCases, routingResult, summarizeLab, type LabItemRow } from "@/lib/evaluation-lab/evaluation-lab-aggregation";
import { GOLDEN_EVAL_SET } from "@/lib/evaluation-lab/golden-eval-set";

function item(over: Partial<LabItemRow>): LabItemRow {
  return {
    goldenId: "concept-addition-no-regroup",
    question: "q",
    status: "pass",
    sourceAgent: "Concept",
    overallScore: 90,
    groundednessScore: 95,
    accuracyScore: 100,
    safetyScore: 100,
    hallucinationRisk: "Low",
    latencyMs: 20000,
    responseExcerpt: "e",
    errorMessage: null,
    traceId: "t",
    ...over,
  };
}

test("golden set is the single typed source and every case has a human-authored expectation", () => {
  assert.equal(GOLDEN_EVAL_SET.length, 11);
  for (const g of GOLDEN_EVAL_SET) {
    assert.ok(g.expectedAgent === null || ["Concept", "Practice", "Assessment"].includes(g.expectedAgent), g.id);
  }
  assert.equal(GOLDEN_EVAL_SET.find((g) => g.id === "off-topic-probe")?.expectedAgent, null);
  assert.equal(GOLDEN_EVAL_SET.find((g) => g.id === "misconception-carry-forgotten")?.expectedAgent, "Concept");
});

test("routing passes when the Router's actual agent matches the expected agent", () => {
  assert.equal(routingResult("Concept", "Concept", "pass"), "pass");
  assert.equal(routingResult("Concept", "Practice", "pass"), "fail");
});

test("an off-topic case passes only when no curriculum agent handled it", () => {
  assert.equal(routingResult(null, null, "pass"), "pass");
  assert.equal(routingResult(null, "Concept", "fail"), "fail");
});

test("incomplete or unknown cases are not run, never guessed", () => {
  assert.equal(routingResult("Concept", "Concept", "error"), "not_run");
  assert.equal(routingResult("Concept", null, "pending"), "not_run");
  assert.equal(routingResult("not_in_dataset", "Concept", "pass"), "not_run");
});

test("cases take their expectation from the golden set by id", () => {
  const [c] = buildLabCases([item({ goldenId: "practice-word-problem", sourceAgent: "Concept" })]);
  assert.equal(c.expectedAgent, "Practice");
  assert.equal(c.routing, "fail");
});

test("a stored case that is no longer in the golden set is marked as such", () => {
  const [c] = buildLabCases([item({ goldenId: "retired-case" })]);
  assert.equal(c.expectedAgent, "not_in_dataset");
  assert.equal(c.routing, "not_run");
});

test("summary reports routing and gate rates with their sample sizes", () => {
  const cases = buildLabCases([
    item({ goldenId: "concept-addition-no-regroup", sourceAgent: "Concept" }),
    item({ goldenId: "practice-word-problem", sourceAgent: "Concept", status: "fail", overallScore: 40 }),
    item({ goldenId: "assessment-addition-regroup", sourceAgent: "Assessment" }),
    item({ goldenId: "concept-subtraction-regroup", status: "error", sourceAgent: null, overallScore: null }),
  ]);
  const s = summarizeLab(cases);
  assert.equal(s.routing.passed, 2);
  assert.equal(s.routing.evaluated, 3);
  assert.equal(s.routing.notRun, 1);
  assert.ok(Math.abs((s.routing.rate ?? 0) - 2 / 3) < 1e-9);
  assert.equal(s.qualityGate.passed, 2);
  assert.equal(s.qualityGate.evaluated, 3);
  assert.equal(s.judgeMeans.overall.sample, 3);
  assert.equal(s.judgeMeans.overall.mean, (90 + 40 + 90) / 3);
});

test("means are null, not zero, when nothing was scored", () => {
  const s = summarizeLab([]);
  assert.equal(s.routing.rate, null);
  assert.equal(s.judgeMeans.safety.mean, null);
  assert.equal(s.judgeMeans.safety.sample, 0);
});

test("legacy items with no judge output contribute nothing to judge means", () => {
  const cases = buildLabCases([item({ overallScore: null, groundednessScore: null, accuracyScore: null, safetyScore: null, hallucinationRisk: null })]);
  const s = summarizeLab(cases);
  assert.equal(s.judgeMeans.overall.sample, 0);
  assert.deepEqual(s.hallucinationRisk, {});
});
