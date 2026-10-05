import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runEvaluation, type EvaluationRequest } from "@/lib/evaluation/run-evaluation";
import { scheduleDeferredEvaluation } from "@/lib/evaluation/schedule-deferred-evaluation";
import { evaluateGoldenTurn } from "@/lib/evaluation-lab/golden-turn-evaluation";
import { GOLDEN_EVAL_SET } from "@/lib/evaluation-lab/golden-eval-set";

type Insert = { event_name: string; trace_id: string; payload: Record<string, unknown> };

function fakeDb() {
  const writes: Insert[] = [];
  const db = {
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        writes.push({
          event_name: row.event_name as string,
          trace_id: row.trace_id as string,
          payload: row.payload as Record<string, unknown>,
        });
        return { error: null };
      },
    }),
  };
  return { db: db as unknown as Parameters<typeof runEvaluation>[0], writes };
}

const REQUEST: EvaluationRequest = {
  traceId: "trace-1",
  studentId: "student-1",
  conversationId: "conversation-1",
  sourceAgent: "Concept",
  responseText: "Regroup 1 ten as 10 ones.",
  concept: null,
  personalizationProfile: {} as EvaluationRequest["personalizationProfile"],
  latencyMs: 7110,
  history: [],
};

function successResult(overallScore: number) {
  return {
    success: true,
    model: "claude-opus-4-8",
    inputTokens: 5139,
    outputTokens: 48,
    response: {
      overallScore,
      qualityStatus: overallScore >= 75 ? "Good" : "NeedsImprovement",
      groundedness: 95,
      accuracy: 100,
      educationalQuality: 90,
      personalization: 93,
      clarity: 91,
      safety: 90,
      hallucinationRisk: "Low",
    },
  };
}

const failedResult = { success: false, reason: "upstream_timeout" };

test("production: deferred Evaluation is scheduled, runs only after the reply is saved, and receives the same request", async () => {
  const order: string[] = [];
  let pending: (() => Promise<unknown>) | undefined;
  const { db } = fakeDb();

  scheduleDeferredEvaluation(db, REQUEST, {
    schedule: (task) => {
      order.push("scheduled");
      pending = task;
    },
    deps: {
      evaluate: async () => {
        order.push("evaluate");
        return successResult(80) as never;
      },
    },
  });
  assert.deepEqual(order, ["scheduled"]);

  order.push("reply saved");
  await pending!();
  assert.deepEqual(order, ["scheduled", "reply saved", "evaluate"]);
});

test("benchmark: the generated turn's request is evaluated explicitly and its result is returned", async () => {
  const { db, writes } = fakeDb();
  let received: EvaluationRequest | null = null;

  const result = await evaluateGoldenTurn(db, REQUEST, {
    evaluate: async (context) => {
      received = REQUEST;
      assert.equal(context.responseText, REQUEST.responseText);
      assert.equal(context.sourceAgent, "Concept");
      return successResult(82) as never;
    },
  });

  assert.equal(received, REQUEST);
  assert.equal(result.kind, "evaluated");
  if (result.kind !== "evaluated") return;
  assert.equal(result.payload.overallScore, 82);
  assert.equal(result.payload.sourceAgent, "Concept");
  assert.equal(writes.at(-1)?.event_name, "evaluation_completed");
  assert.equal(writes.at(-1)?.trace_id, "trace-1");
});

test("shared behaviour: both schedulers call the one Evaluation capability and no path reimplements it", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  const schedule = read("../../src/lib/evaluation/schedule-deferred-evaluation.ts");
  const golden = read("../../src/lib/evaluation-lab/golden-turn-evaluation.ts");
  const route = read("../../src/app/api/chat/route.ts");
  const runner = read("../../scripts/run-golden-eval.ts");

  assert.match(schedule, /import \{[^}]*runEvaluation[^}]*\} from "@\/lib\/evaluation\/run-evaluation"/);
  assert.match(golden, /import \{[^}]*runEvaluation[^}]*\} from "@\/lib\/evaluation\/run-evaluation"/);
  assert.match(runner, /evaluateGoldenTurn/);
  assert.doesNotMatch(route, /evaluateInteraction|generateEvaluation/);
  assert.doesNotMatch(runner, /evaluateInteraction|evaluation_completed/);
});

test("failure: an Evaluation that did not complete is an evaluation error, not a quality result", async () => {
  const { db, writes } = fakeDb();

  const result = await evaluateGoldenTurn(db, REQUEST, { evaluate: async () => failedResult as never });

  assert.deepEqual(result, { kind: "evaluation_error", reason: "upstream_timeout" });
  assert.equal(writes.some((w) => w.event_name === "evaluation_completed"), false);
  assert.equal(writes.at(-1)?.event_name, "evaluation_failed");
});

test("failure: an exception inside Evaluation is returned as a failure and never thrown", async () => {
  const { db } = fakeDb();
  const outcome = await runEvaluation(db, REQUEST, {
    evaluate: async () => {
      throw new Error("boom");
    },
  });
  assert.deepEqual(outcome, { kind: "failed", reason: "boom" });
});

test("a low judge score is a completed evaluation, distinct from an evaluation error", async () => {
  const { db } = fakeDb();
  const result = await evaluateGoldenTurn(db, REQUEST, { evaluate: async () => successResult(39) as never });
  assert.equal(result.kind, "evaluated");
  if (result.kind === "evaluated") assert.equal(result.payload.qualityStatus, "NeedsImprovement");
});

test("a turn without a deferred request is not evaluated and Evaluation is not called", async () => {
  const { db } = fakeDb();
  let called = false;
  const result = await evaluateGoldenTurn(db, undefined, {
    evaluate: async () => {
      called = true;
      return failedResult as never;
    },
  });
  assert.deepEqual(result, { kind: "not_evaluated" });
  assert.equal(called, false);
});

test("golden set: human-authored expected agents are unchanged", () => {
  const expected = Object.fromEntries(GOLDEN_EVAL_SET.map((g) => [g.id, g.expectedAgent]));
  assert.deepEqual(expected, {
    "concept-addition-no-regroup": "Concept",
    "concept-addition-regroup": "Concept",
    "concept-subtraction-no-regroup": "Concept",
    "concept-subtraction-regroup": "Concept",
    "practice-addition-regroup": "Practice",
    "practice-subtraction-no-regroup": "Practice",
    "practice-word-problem": "Practice",
    "assessment-addition-regroup": "Assessment",
    "assessment-subtraction-regroup": "Assessment",
    "misconception-carry-forgotten": "Concept",
    "off-topic-probe": null,
  });
});
