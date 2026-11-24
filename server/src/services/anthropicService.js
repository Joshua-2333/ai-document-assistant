// server/src/services/anthropicService.js
import Anthropic from "@anthropic-ai/sdk";
import { aiConfig } from "../config/aiConfig.js";

import {
  reserveAiUsage,
  completeAiUsage,
  markAiUsageUncertain,
} from "./aiUsageService.js";

let client;

// Initialize the Anthropic client only when needed
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key is not configured.");
  }

  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 0,
      timeout: 60000,
    });
  }

  return client;
}

// Build the request using server-controlled settings
function buildRequest(
  prompt,
  history = [],
  systemPrompt = ""
) {
  const model = process.env.ANTHROPIC_MODEL;

  if (model !== "claude-haiku-5-5") {
    throw new Error("Unsupported Anthropic model.");
  }

  const messages = [
    ...history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    {
      role: "user",
      content: prompt,
    },
  ];

  return {
    model,
    max_tokens: aiConfig.maxOutputTokens,
    thinking: {
      type: "disabled",
    },
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages,
  };
}

// Count and validate input tokens before generation
async function validateInputTokens(request) {
  const { model, messages, system } = request;

  const result = await getClient().messages.countTokens({
    model,
    messages,
    ...(system ? { system } : {}),
  });

  const inputTokens = result.input_tokens;

  // Reject invalid token-count responses
  if (
    !Number.isSafeInteger(inputTokens) ||
    inputTokens <= 0
  ) {
    throw new Error("Invalid input token count.");
  }

  // Enforce the configured input token limit
  if (inputTokens > aiConfig.maxInputTokens) {
    const error = new Error(
      "The document and conversation exceed the allowed input token limit."
    );

    error.status = 413;
    throw error;
  }

  return inputTokens;
}

// Generate a response using Claude with spending protection
export async function generateResponse(
  prompt,
  history = [],
  systemPrompt = "",
  visitorId
) {
  // Require valid server-generated visitor identification
  if (
    typeof visitorId !== "string" ||
    !/^[a-f0-9]{64}$/.test(visitorId)
  ) {
    throw new Error("Valid visitor identification is required.");
  }

  // Build the Anthropic request
  const request = buildRequest(
    prompt,
    history,
    systemPrompt
  );

  // Count and validate input tokens
  let inputTokens;

  try {
    inputTokens = await validateInputTokens(request);
  } catch (error) {
    if (error.status === 413) {
      throw newTokenLimitError();
    }

    console.error("Anthropic token counting failed:", {
      name: error.name,
      status: error.status,
    });

    throw new Error("Unable to validate AI input tokens.");
  }

  // Reserve the maximum estimated cost before generation
  const reservation = await reserveAiUsage(
    visitorId,
    request.model,
    inputTokens
  );

  let response;

  try {
    // Send the paid request only after reservation succeeds
    response = await getClient().messages.create(request);

    // Retrieve actual token usage
    const usage = response.usage;

    if (
      !usage ||
      !Number.isSafeInteger(usage.input_tokens) ||
      !Number.isSafeInteger(usage.output_tokens) ||
      usage.input_tokens < 0 ||
      usage.output_tokens < 0
    ) {
      throw new Error("Invalid Anthropic usage information.");
    }

    // Reject unexpected billing categories
    if (
      (usage.cache_creation_input_tokens ?? 0) !== 0 ||
      (usage.cache_read_input_tokens ?? 0) !== 0
    ) {
      throw new Error("Unexpected cached token usage.");
    }

    // Record the actual cost in PostgreSQL
    await completeAiUsage(
      reservation.id,
      usage.input_tokens,
      usage.output_tokens
    );
  } catch (error) {
    // Preserve the reservation when billing is uncertain
    try {
      await markAiUsageUncertain(reservation.id);
    } catch (trackingError) {
      console.error("Unable to mark AI usage as uncertain:", {
        name: trackingError.name,
      });
    }

    // Avoid exposing sensitive API request details
    console.error("Anthropic generation failed:", {
      name: error.name,
      status: error.status,
    });

    throw new Error("Unable to generate an AI response.");
  }

  // Extract text blocks from the completed response
  const answer = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!answer) {
    throw new Error("Anthropic returned an empty response.");
  }

  return answer;
}

// Return a safe input-limit error
function newTokenLimitError() {
  const error = new Error(
    "The document and conversation exceed the allowed input token limit."
  );

  error.status = 413;
  return error;
}