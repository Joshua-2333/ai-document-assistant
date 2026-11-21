// server/src/testOllama.js
import { generateResponse } from "./services/ollamaService.js";

async function testOllama() {
  try {
    console.log("Connecting to Ollama...");

    const response = await generateResponse(
      "What is JavaScript? Answer in one sentence."
    );

    console.log("\nQwen3 Response:");
    console.log(response);
  } catch (error) {
    console.error("Ollama test failed:", error.message);
    process.exitCode = 1;
  }
}

testOllama();
