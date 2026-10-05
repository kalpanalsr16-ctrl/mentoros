import { GOLDEN_EVAL_SET, type ExpectedAgent } from "@/lib/evaluation-lab/golden-eval-set";

export type RoutingResult = "pass" | "fail" | "not_run";

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
  routing: { passed: number; evaluated: number; notRun: number; rate: number | null };
  qualityGate: { passed: number; evaluated: number; rate: number | null };
  judgeMeans: {
    overall: MeanWithSample;
    groundedness: MeanWithSample;
    accuracy: MeanWithSample;
    safety: MeanWithSample;
  };
  hallucinationRisk: Record<string, number>;
};

export type MeanWithSample = { mean: number | null; sample: number };

const COMPLETED = new Set(["pass", "fail"]);

/**
 * Deterministic routing check: the Router's actual agent equals the
 * human-authored expected agent. Cases that didn't complete, or whose golden
 * case no longer exists, are not run rather than guessed at.
 */
export function routingResult(
  expected: ExpectedAgent | null | "not_in_dataset",
  actualAgent: string | null,
  status: string,
): RoutingResult {
  if (expected === "not_in_dataset" || !COMPLETED.has(status)) return "not_run";
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

function rate(passed: number, evaluated: number): number | null {
  return evaluated === 0 ? null : passed / evaluated;
}

export function summarizeLab(cases: LabCase[]): LabSummary {
  const routed = cases.filter((c) => c.routing !== "not_run");
  const routingPassed = routed.filter((c) => c.routing === "pass").length;
  const completed = cases.filter((c) => COMPLETED.has(c.status));
  const gatePassed = completed.filter((c) => c.status === "pass").length;

  const hallucinationRisk: Record<string, number> = {};
  for (const c of cases) {
    if (c.judge.hallucinationRisk) {
      hallucinationRisk[c.judge.hallucinationRisk] = (hallucinationRisk[c.judge.hallucinationRisk] ?? 0) + 1;
    }
  }

  return {
    caseCount: cases.length,
    routing: {
      passed: routingPassed,
      evaluated: routed.length,
      notRun: cases.length - routed.length,
      rate: rate(routingPassed, routed.length),
    },
    qualityGate: { passed: gatePassed, evaluated: completed.length, rate: rate(gatePassed, completed.length) },
    judgeMeans: {
      overall: mean(cases.map((c) => c.judge.overall)),
      groundedness: mean(cases.map((c) => c.judge.groundedness)),
      accuracy: mean(cases.map((c) => c.judge.accuracy)),
      safety: mean(cases.map((c) => c.judge.safety)),
    },
    hallucinationRisk,
  };
}
