import { GOLDEN_EVAL_SET, type ExpectedAgent } from "@/lib/evaluation-lab/golden-eval-set";

/**
 * PASSED / FAILED: the case ran and the deterministic check was applied.
 * ERRORED: the case was attempted but the execution errored, so there is no result.
 * NOT RUN: no execution result exists (never started, still pending or running,
 * or the stored case is not in the current golden set).
 */
export type RoutingResult = "pass" | "fail" | "errored" | "not_run";

/** Counts kept separate, so the denominator is always explicit. `evaluated` = passed + failed. */
export type OutcomeCounts = {
  total: number;
  passed: number;
  failed: number;
  errored: number;
  notRun: number;
  evaluated: number;
  rate: number | null;
};

export type LabRunRow = {
  id: string;
  label: string;
  status: string;
  isPublic: boolean;
  startedAt: string;
  versionLabel: string | null;
  model: string | null;
};

export type LabItemRow = {
  goldenId: string;
  question: string;
  status: string;
  sourceAgent: string | null;
  overallScore: number | null;
  groundednessScore: number | null;
  accuracyScore: number | null;
  safetyScore: number | null;
  hallucinationRisk: string | null;
  latencyMs: number | null;
  responseExcerpt: string | null;
  errorMessage: string | null;
  traceId: string | null;
};

/** `expectedAgent` is human-authored ground truth. `not_in_dataset` means the stored case no longer exists in the golden set. */
export type LabCase = {
  goldenId: string;
  question: string;
  status: string;
  expectedAgent: ExpectedAgent | null | "not_in_dataset";
  actualAgent: string | null;
  routing: RoutingResult;
  minOverallScore: number | null;
  judge: {
    overall: number | null;
    groundedness: number | null;
    accuracy: number | null;
    safety: number | null;
    hallucinationRisk: string | null;
  };
  latencyMs: number | null;
  responseExcerpt: string | null;
  errorMessage: string | null;
  traceId: string | null;
};

export type LabSummary = {
  caseCount: number;
  routing: OutcomeCounts;
  qualityGate: OutcomeCounts;
  judgeMeans: {
    overall: MeanWithSample;
    groundedness: MeanWithSample;
    accuracy: MeanWithSample;
    safety: MeanWithSample;
  };
  hallucinationRisk: Record<string, number>;
};

export type MeanWithSample = { mean: number | null; sample: number };

/**
 * Deterministic routing check: the Router's actual agent equals the
 * human-authored expected agent. An execution error is ERRORED, not a
 * failed routing decision. Anything without a result is NOT RUN, never guessed.
 */
export function routingResult(
  expected: ExpectedAgent | null | "not_in_dataset",
  actualAgent: string | null,
  status: string,
): RoutingResult {
  if (expected === "not_in_dataset") return "not_run";
  if (status === "error") return "errored";
  if (status !== "pass" && status !== "fail") return "not_run";
  return (actualAgent ?? null) === expected ? "pass" : "fail";
}

const GOLDEN_BY_ID = new Map(GOLDEN_EVAL_SET.map((g) => [g.id, g]));

export function buildLabCases(items: LabItemRow[]): LabCase[] {
  return items.map((item) => {
    const golden = GOLDEN_BY_ID.get(item.goldenId);
    const expected: LabCase["expectedAgent"] = golden ? golden.expectedAgent : "not_in_dataset";
    return {
      goldenId: item.goldenId,
      question: item.question,
      status: item.status,
      expectedAgent: expected,
      actualAgent: item.sourceAgent,
      routing: routingResult(expected, item.sourceAgent, item.status),
      minOverallScore: golden?.minOverallScore ?? null,
      judge: {
        overall: item.overallScore,
        groundedness: item.groundednessScore,
        accuracy: item.accuracyScore,
        safety: item.safetyScore,
        hallucinationRisk: item.hallucinationRisk,
      },
      latencyMs: item.latencyMs,
      responseExcerpt: item.responseExcerpt,
      errorMessage: item.errorMessage,
      traceId: item.traceId,
    };
  });
}

function mean(values: (number | null)[]): MeanWithSample {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return { mean: null, sample: 0 };
  return { mean: present.reduce((sum, v) => sum + v, 0) / present.length, sample: present.length };
}

function countOutcomes(outcomes: ("pass" | "fail" | "errored" | "not_run")[]): OutcomeCounts {
  const count = (o: string) => outcomes.filter((x) => x === o).length;
  const passed = count("pass");
  const failed = count("fail");
  const evaluated = passed + failed;
  return {
    total: outcomes.length,
    passed,
    failed,
    errored: count("errored"),
    notRun: count("not_run"),
    evaluated,
    rate: evaluated === 0 ? null : passed / evaluated,
  };
}

/** Quality gate outcome uses the same four states: pass/fail is the gate result, error is ERRORED, anything else is NOT RUN. */
function gateOutcome(status: string): "pass" | "fail" | "errored" | "not_run" {
  if (status === "pass" || status === "fail") return status;
  if (status === "error") return "errored";
  return "not_run";
}

export function summarizeLab(cases: LabCase[]): LabSummary {

  const hallucinationRisk: Record<string, number> = {};
  for (const c of cases) {
    if (c.judge.hallucinationRisk) {
      hallucinationRisk[c.judge.hallucinationRisk] = (hallucinationRisk[c.judge.hallucinationRisk] ?? 0) + 1;
    }
  }

  return {
    caseCount: cases.length,
    routing: countOutcomes(cases.map((c) => c.routing)),
    qualityGate: countOutcomes(cases.map((c) => gateOutcome(c.status))),
    judgeMeans: {
      overall: mean(cases.map((c) => c.judge.overall)),
      groundedness: mean(cases.map((c) => c.judge.groundedness)),
      accuracy: mean(cases.map((c) => c.judge.accuracy)),
      safety: mean(cases.map((c) => c.judge.safety)),
    },
    hallucinationRisk,
  };
}
