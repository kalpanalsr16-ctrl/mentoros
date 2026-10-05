import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { estimateCostForModel, priceFor, PRICED_MODELS } from "@/lib/llm/pricing";

test("the known model is priced from the single pricing source", () => {
  assert.deepEqual(priceFor("claude-opus-4-8"), { inputPerMillionUsd: 5, outputPerMillionUsd: 25 });
  assert.deepEqual(PRICED_MODELS, ["claude-opus-4-8"]);
});

test("an unknown model has no price and never receives a fabricated one", () => {
  assert.equal(priceFor("some-future-model"), null);
  assert.equal(estimateCostForModel("some-future-model", 1_000_000, 1_000_000), null);
});

test("prototype keys are not mistaken for priced models", () => {
  assert.equal(priceFor("constructor"), null);
  assert.equal(priceFor("__proto__"), null);
});

test("cost is tokens times the per-million rates", () => {
  assert.equal(estimateCostForModel("claude-opus-4-8", 1_000_000, 1_000_000), 30);
  assert.equal(estimateCostForModel("claude-opus-4-8", 0, 0), 0);
  assert.ok(Math.abs((estimateCostForModel("claude-opus-4-8", 2000, 500) ?? 0) - 0.0225) < 1e-12);
});

test("the copy of the rates still in client.ts matches the pricing source", () => {
  const client = readFileSync(resolve(process.cwd(), "src/lib/llm/client.ts"), "utf8");
  const input = client.match(/INPUT_COST_PER_MILLION_TOKENS_USD = (\d+)/)?.[1];
  const output = client.match(/OUTPUT_COST_PER_MILLION_TOKENS_USD = (\d+)/)?.[1];
  const model = client.match(/const MODEL = "([^"]+)"/)?.[1];
  const price = priceFor(model ?? "");
  assert.equal(Number(input), price?.inputPerMillionUsd, "input rate drifted from pricing.ts");
  assert.equal(Number(output), price?.outputPerMillionUsd, "output rate drifted from pricing.ts");
});
