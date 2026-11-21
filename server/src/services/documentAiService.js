// server/src/services/documentAiService.js
import { connectMcpServer } from "./mcpClient.js";
import { generateResponse } from "./ollamaService.js";

export async function askDocument(filename, question) {
  let client;

  try {
    client = await connectMcpServer();

    const result = await client.callTool({
      name: "read_document",
      arguments: { filename },
    });

    if (result.isError) {
      throw new Error("MCP failed to read the document.");
    }

    const textContent = result.content.find(
      (item) => item.type === "text"
    );

    if (!textContent) {
      throw new Error("No document content returned from MCP.");
    }

    const documentContent = textContent.text;

    if (documentContent.startsWith("Error:")) {
      throw new Error(documentContent);
    }

    const prompt = `
You are an AI document assistant.

Answer the user's question using only the document content below.

If the answer is not found in the document, say:
"I could not find that information in the document."

Document: ${filename}

Document content:
${documentContent}

User question:
${question}
`;

    return await generateResponse(prompt);
  } finally {
    if (client) {
      await client.close();
    }
  }
}
