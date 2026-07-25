import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyIntent, hasExplicitArithmeticExpression, ROUTING_CONFIDENCE_THRESHOLD } from "@/lib/agents/router-agent";
import type { RouterClassification, RouterClassificationResult } from "@/lib/llm/client";
import type { ClaudeMessage } from "@/lib/agents/context-agent";

/**
 * Regression suite for the live bug: "can you answer this addition
 * question 45+89" got `confidence: 0.72` (genuine category ambiguity --
 * Learning vs. Assessment vs. Practice -- not incompleteness) and that
 * alone tripped clarificationRequired. Covers the deterministic
 * arithmetic-completeness check directly, the fixed classifyIntent gate,
 * and the specific non-regressions called out during root-cause review:
 * safety-state leakage, retry, fresh vs. multi-turn history.
 */

// --- hasExplicitArithmeticExpression: direct per-pattern coverage ---

test("hasExplicitArithmeticExpression: symbolic addition", () => {
  assert.equal(hasExplicitArithmeticExpression("45+89"), true);
});

test("hasExplicitArithmeticExpression: symbolic subtraction", () => {
  assert.equal(hasExplicitArithmeticExpression("what is 52-28?"), true);
});

test("hasExplicitArithmeticExpression: symbolic multiplication (* and ×)", () => {
  assert.equal(hasExplicitArithmeticExpression("6*7"), true);
  assert.equal(hasExplicitArithmeticExpression("6×7"), true);
});

test("hasExplicitArithmeticExpression: symbolic division (/ and ÷)", () => {
  assert.equal(hasExplicitArithmeticExpression("10/2"), true);
  assert.equal(hasExplicitArithmeticExpression("10÷2"), true);
});

test("hasExplicitArithmeticExpression: word form 'plus'", () => {
  assert.equal(hasExplicitArithmeticExpression("45 plus 89"), true);
});

test("hasExplicitArithmeticExpression: word form 'minus'", () => {
  assert.equal(hasExplicitArithmeticExpression("45 minus 89"), true);
});

test("hasExplicitArithmeticExpression: word form 'times'", () => {
  assert.equal(hasExplicitArithmeticExpression("6 times 7"), true);
});

test("hasExplicitArithmeticExpression: word form 'divided by'", () => {
  assert.equal(hasExplicitArithmeticExpression("10 divided by 2"), true);
});

test("hasExplicitArithmeticExpression: imperative 'multiply X by Y'", () => {
  assert.equal(hasExplicitArithmeticExpression("multiply 6 by 7"), true);
});

test("hasExplicitArithmeticExpression: imperative 'divide X by Y'", () => {
  assert.equal(hasExplicitArithmeticExpression("divide 10 by 2"), true);
});

test("hasExplicitArithmeticExpression: extra spacing", () => {
  assert.equal(hasExplicitArithmeticExpression("45 + 89"), true);
});

test("hasExplicitArithmeticExpression: surrounding punctuation/prose", () => {
  assert.equal(hasExplicitArithmeticExpression("What is 45+89?"), true);
  assert.equal(hasExplicitArithmeticExpression("solve 45+89"), true);
  assert.equal(hasExplicitArithmeticExpression("can you answer this addition question 45+89"), true);
});

test("hasExplicitArithmeticExpression: negative numbers fall through the operator pattern (accepted, not engineered for)", () => {
  assert.equal(hasExplicitArithmeticExpression("-5+89"), true);
});

test("hasExplicitArithmeticExpression: malformed expression with a missing operand returns false", () => {
  assert.equal(hasExplicitArithmeticExpression("45+"), false);
});

test("hasExplicitArithmeticExpression: no operation named at all returns false", () => {
  assert.equal(hasExplicitArithmeticExpression("help me with addition"), false);
});

test("hasExplicitArithmeticExpression: false-positive guard -- two unrelated numbers with no operator between them", () => {
  assert.equal(hasExplicitArithmeticExpression("I'm 10 years old and in grade 5"), false);
});

// --- classifyIntent: the actual gate, with a mocked classify() ---

function mockClassify(overrides: Partial<RouterClassification> = {}) {
  return async (): Promise<RouterClassificationResult> => ({
    success: true,
    classification: {
      primaryIntent: "Learning",
      secondaryIntent: null,
      confidence: 0.72,
      topic: "Addition",
      subtopic: "Adding Two-Digit Numbers with Regrouping",
      clarificationQuestion: null,
      requestIsFullySpecified: null,
      ...overrides,
    },
    model: "claude-opus-4-8",
    inputTokens: 100,
    outputTokens: 20,
  });
}

function historyEndingWith(content: string, priorTurns: ClaudeMessage[] = []): ClaudeMessage[] {
  return [...priorTurns, { role: "user", content }];
}

test("classifyIntent: '45+89' at the exact reported confidence (0.72) does not require clarification", async () => {
  const result = await classifyIntent(historyEndingWith("45+89"), mockClassify());
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.intent.needsClarification, false);
});

test("classifyIntent: 'solve 45+89' does not require clarification", async () => {
  const result = await classifyIntent(historyEndingWith("solve 45+89"), mockClassify());
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.intent.needsClarification, false);
});

test("classifyIntent: the exact reported sentence does not require clarification, and preserves topic/subtopic", async () => {
  const result = await classifyIntent(
    historyEndingWith("can you answer this addition question 45+89"),
    mockClassify(),
  );
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.intent.needsClarification, false);
    assert.equal(result.intent.confidence, 0.72);
    assert.equal(result.intent.topic, "Addition");
    assert.equal(result.intent.subtopic, "Adding Two-Digit Numbers with Regrouping");
    assert.equal(result.intent.clarificationQuestion, undefined);
  }
});

test("classifyIntent: 'help me with addition' still requires clarification -- no operands, genuinely vague", async () => {
  const classify = mockClassify({ confidence: 0.6, topic: "Addition", subtopic: null, requestIsFullySpecified: false });
  const result = await classifyIntent(historyEndingWith("help me with addition"), classify);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.intent.needsClarification, true);
    assert.equal(result.intent.clarificationQuestion, "Could you say a bit more about what you'd like help with?");
  }
});

test("classifyIntent: 'I don't understand regrouping' -- confident classification needs no clarification", async () => {
  const classify = mockClassify({ confidence: 0.9, topic: "Addition", subtopic: "Regrouping", requestIsFullySpecified: null });
  const result = await classifyIntent(historyEndingWith("I don't understand regrouping"), classify);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.intent.needsClarification, false);
});

test("classifyIntent: 'I don't understand regrouping' -- low category confidence but model-judged fully-specified still needs no clarification", async () => {
  const classify = mockClassify({ confidence: 0.5, topic: "Addition", subtopic: "Regrouping", requestIsFullySpecified: true });
  const result = await classifyIntent(historyEndingWith("I don't understand regrouping"), classify);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.intent.needsClarification, false);
});

test("classifyIntent: low confidence AND not fully specified -- clarification question is real, never the generic fallback when the model supplies one", async () => {
  const classify = mockClassify({
    confidence: 0.4,
    topic: null,
    subtopic: null,
    requestIsFullySpecified: false,
    clarificationQuestion: "Are you referring to equivalent fractions or adding fractions?",
  });
  const result = await classifyIntent(historyEndingWith("I don't get this"), classify);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.intent.needsClarification, true);
    assert.equal(result.intent.clarificationQuestion, "Are you referring to equivalent fractions or adding fractions?");
  }
});

test("classifyIntent: 'what is 52-28?' does not require clarification", async () => {
  const result = await classifyIntent(
    historyEndingWith("what is 52-28?"),
    mockClassify({ topic: "Subtraction", subtopic: "Two-Digit Subtraction" }),
  );
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.intent.needsClarification, false);
});

test("classifyIntent: 'multiply 6 by 7' does not require clarification", async () => {
  const result = await classifyIntent(
    historyEndingWith("multiply 6 by 7"),
    mockClassify({ topic: "Multiplication", subtopic: "Single-Digit Multiplication" }),
  );
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.intent.needsClarification, false);
});

test("classifyIntent: a benign arithmetic request is unaffected by an earlier safety-declined turn in the same history", async () => {
  const priorTurns: ClaudeMessage[] = [
    { role: "user", content: "some earlier message" },
    { role: "assistant", content: "I can't help with that here. Let's get back to your math questions — what would you like to work on?" },
  ];
  const result = await classifyIntent(historyEndingWith("45+89", priorTurns), mockClassify());
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.intent.needsClarification, false);
});

test("classifyIntent: retry after an incorrect clarification -- the same request no longer misfires on a second attempt", async () => {
  const history = historyEndingWith("can you answer this addition question 45+89");
  const first = await classifyIntent(history, mockClassify());
  const secondAttempt = await classifyIntent(history, mockClassify());
  assert.equal(first.success, true);
  assert.equal(secondAttempt.success, true);
  if (first.success && secondAttempt.success) {
    assert.equal(first.intent.needsClarification, false);
    assert.equal(secondAttempt.intent.needsClarification, false);
  }
});

test("classifyIntent: fresh conversation (single-message history) resolves the same as multi-turn history", async () => {
  const freshResult = await classifyIntent(historyEndingWith("45+89"), mockClassify());
  const multiTurnResult = await classifyIntent(
    historyEndingWith("45+89", [
      { role: "user", content: "hi" },
      { role: "assistant", content: "Hi! What would you like to work on today?" },
    ]),
    mockClassify(),
  );
  assert.equal(freshResult.success, true);
  assert.equal(multiTurnResult.success, true);
  if (freshResult.success && multiTurnResult.success) {
    assert.equal(freshResult.intent.needsClarification, false);
    assert.equal(multiTurnResult.intent.needsClarification, false);
  }
});

test("classifyIntent: threshold constant is unchanged at 0.8 -- the fix narrows what reaches the gate, not the gate itself", () => {
  assert.equal(ROUTING_CONFIDENCE_THRESHOLD, 0.8);
});

test("classifyIntent: router failure still fails open (unchanged behavior)", async () => {
  const result = await classifyIntent(historyEndingWith("45+89"), async () => ({
    success: false,
    reason: "rate_limited",
  }));
  assert.equal(result.success, false);
});
