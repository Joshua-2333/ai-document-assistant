// server/src/services/anthropicService.js
import Anthropic from "@anthropic-ai/sdk";
import { aiConfig } from "../config/aiConfig.js";

let client;

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

function buildRequest(prompt, history = [], systemPrompt = "") {
  const model = process.env.ANTHROPIC_MODEL;

  if (!model) {
    throw new Error("Anthropic model is not configured.");
  }

  const messages = [
    ...history,
    {
      role: "user",
      content: prompt,
    },
  ];

  return {
    model,
    max_tokens: aiConfig.maxOutputTokens,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages,
  };
}

async function validateInputTokens(request) {
  const { model, messages, system } = request;

  const result = await getClient().messages.countTokens({
    model,
    messages,
    ...(system ? { system } : {}),
  });

  if (result.input_tokens > aiConfig.maxInputTokens) {
    const error = new Error(
      "The document and conversation exceed the allowed input token limit."
    );

    error.status = 413;
    throw error;
  }

  return result.input_tokens;
}

export async function generateResponse(
  prompt,
  history = [],
  systemPrompt = ""
) {
  // Paid requests remain disabled until spending
  // protections are implemented.
  throw new Error("Anthropic integration is not enabled yet.");
}