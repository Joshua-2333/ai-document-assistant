// server/src/services/aiProviderService.js
import * as ollamaService from "./ollamaService.js";
import * as anthropicService from "./anthropicService.js";

export async function generateResponse(
  prompt,
  history = [],
  systemPrompt = "",
  visitorId
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
      // Require visitor identification for paid AI requests
      if (
        typeof visitorId !== "string" ||
        !/^[a-f0-9]{64}$/.test(visitorId)
      ) {
        throw new Error("Valid visitor identification is required.");
      }

      return await anthropicService.generateResponse(
        prompt,
        history,
        systemPrompt,
        visitorId
      );

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}