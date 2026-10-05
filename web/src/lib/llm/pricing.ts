/**
 * Inference prices for the models MentorOS calls, in USD per million tokens.
 *
 * These are application constants, not provider billing data. Any cost derived
 * from them is an estimate. A model with no entry here has no price, and
 * callers must report it as unpriced rather than guess a rate.
 */
export type ModelPrice = { inputPerMillionUsd: number; outputPerMillionUsd: number };

const MODEL_PRICING: Readonly<Record<string, ModelPrice>> = {
  "claude-opus-4-8": { inputPerMillionUsd: 5, outputPerMillionUsd: 25 },
};

export function priceFor(model: string): ModelPrice | null {
  return Object.prototype.hasOwnProperty.call(MODEL_PRICING, model) ? MODEL_PRICING[model] : null;
}

/** Estimated cost in USD, or null when the model has no known price. */
export function estimateCostForModel(model: string, inputTokens: number, outputTokens: number): number | null {
  const price = priceFor(model);
  if (!price) return null;
  return (inputTokens / 1_000_000) * price.inputPerMillionUsd + (outputTokens / 1_000_000) * price.outputPerMillionUsd;
}

export const PRICED_MODELS: readonly string[] = Object.keys(MODEL_PRICING);
