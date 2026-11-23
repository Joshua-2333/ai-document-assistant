// server/src/config/aiConfig.js

function readLimit(name, maximum, integer = true) {
  const rawValue = process.env[name];
  const value = Number(rawValue);

  if (
    !rawValue ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > maximum ||
    (integer && !Number.isInteger(value))
  ) {
    throw new Error(`Invalid configuration: ${name}`);
  }

  return value;
}

export const aiConfig = Object.freeze({
  maxInputTokens: readLimit("AI_MAX_INPUT_TOKENS", 4000),

  maxOutputTokens: readLimit("AI_MAX_OUTPUT_TOKENS", 500),

  maxRequestsPerVisitor: readLimit(
    "AI_MAX_REQUESTS_PER_VISITOR",
    5
  ),

  maxRequestsPerDay: readLimit(
    "AI_MAX_REQUESTS_PER_DAY",
    100
  ),

  monthlyBudgetUsd: readLimit(
    "AI_MONTHLY_BUDGET_USD",
    4,
    false
  ),
});