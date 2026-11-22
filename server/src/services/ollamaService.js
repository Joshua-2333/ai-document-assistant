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

  const response = await fetch(OLLAMA_URL, {
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
  });

  if (!response.ok) {
    throw new Error(
      `Ollama API request failed: ${response.status}`
    );
  }

  const data = await response.json();

  if (!data.message || typeof data.message.content !== "string") {
    throw new Error("Invalid response received from Ollama.");
  }

  return data.message.content;
}
