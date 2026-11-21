// server/src/testDocumentAi.js
import { askDocument } from "./services/documentAiService.js";

async function testDocumentAi() {
  try {
    console.log("Connecting to the MCP server and Ollama...");

    const filename = "sample-pdf-test.pdf";
    const question = "What library is used to extract text from this PDF?";

    console.log(`Document: ${filename}`);
    console.log(`Question: ${question}`);

    const answer = await askDocument(filename, question);

    console.log("\nQwen3 Answer:");
    console.log(answer);
  } catch (error) {
    console.error("Document AI test failed:", error.message);
    process.exitCode = 1;
  }
}

testDocumentAi();
