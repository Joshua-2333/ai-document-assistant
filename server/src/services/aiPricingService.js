// server/src/services/aiPricingService.js

// Pricing in billionths of a US dollar per token
const NANO_USD_PER_DOLLAR = 1_000_000_000n;

const MODEL_PRICING = Object.freeze({
  "claude-haiku-5-5": Object.freeze({
    input: 100n,
    output: 500n,
  }),
});

export function calculateCostNanoUsd(
  model,
  inputTokens,
  outputTokens
) {
  const pricing = MODEL_PRICING[model];

  if (!Object.hasOwn(MODEL_PRICING, model)) {
    throw new Error(`Unsupported pricing model: ${model}`);
  }

  if (
    !Number.isSafeInteger(inputTokens) ||
    !Number.isSafeInteger(outputTokens) ||
    inputTokens < 0 ||
    outputTokens < 0
  ) {
    throw new Error("Invalid token counts.");
  }

  if (inputTokens > 100000) {
    throw new Error("Input exceeds supported pricing tier.");
  }

  return (
    BigInt(inputTokens) * pricing.input +
    BigInt(outputTokens) * pricing.output
  );
}

export function nanoUsdToUsd(amount) {
  if (typeof amount !== "bigint" || amount < 0n) {
    throw new Error("Invalid cost amount.");
  }

  const dollars = amount / NANO_USD_PER_DOLLAR;
  const fraction = amount % NANO_USD_PER_DOLLAR;

  return `${dollars}.${fraction.toString().padStart(9, "0")}`;
}

export function calculateCostUsd(
  model,
  inputTokens,
  outputTokens
) {
  return nanoUsdToUsd(
    calculateCostNanoUsd(model, inputTokens, outputTokens)
  );
}