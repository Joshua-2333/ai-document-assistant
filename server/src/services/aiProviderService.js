// server/src/services/aiProviderService.js
import * as ollamaService from "./ollamaService.js";
import * as anthropicService from "./anthropicService.js";

export async function generateResponse(
  prompt,
  history = [],
  systemPrompt = ""
) {
  const provider = process.env.AI_PROVIDER || "ollama";

  switch (provider) {
    case "ollama":
      return await ollamaService.generateResponse(
        prompt,
        history,
        systemPrompt
      );

    case "anthropic":
      return await anthropicService.generateResponse(
        prompt,
        history,
        systemPrompt
      );

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}