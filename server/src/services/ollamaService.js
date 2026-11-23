// server/src/services/ollamaService.js
const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "qwen3:latest";

export async function generateResponse(
  prompt,
  history = [],
  systemPrompt = ""
) {
  const messages = [];

  // Add system instructions when provided
  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  // Add previous conversation messages
  messages.push(...history);

  // Add the current user question
  messages.push({
    role: "user",
    content: prompt,
  });

  let response;

  try {
    response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: false,
        think: false,
      }),

      // Stop waiting if Ollama takes longer than 120 seconds
      signal: AbortSignal.timeout(120000),
    });
  } catch (error) {
    // Handle Ollama request timeouts
    if (error.name === "TimeoutError") {
      const timeoutError = new Error(
        "Ollama took too long to respond."
      );

      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    // Handle connection failures
    if (error instanceof TypeError) {
      const connectionError = new Error(
        "Unable to connect to Ollama. Make sure Ollama is running."
      );

      connectionError.statusCode = 503;
      throw connectionError;
    }

    // Preserve unexpected errors
    throw error;
  }

  // Handle unsuccessful Ollama API responses
  if (!response.ok) {
    const apiError = new Error(
      `Ollama API request failed: ${response.status}`
    );

    apiError.statusCode = 502;
    throw apiError;
  }

  const data = await response.json();

  // Validate the response from Ollama
  if (!data.message || typeof data.message.content !== "string") {
    throw new Error("Invalid response received from Ollama.");
  }

  return data.message.content;
}
