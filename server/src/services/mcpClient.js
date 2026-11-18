// server/src/services/mcpClient.js
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const projectRoot = path.resolve(__dirname, "../../../");

const pythonPath = path.join(
  projectRoot,
  "mcp-server",
  ".venv",
  "bin",
  "python"
);

const mcpServerPath = path.join(
  projectRoot,
  "mcp-server",
  "main.py"
);

export async function connectMcpServer() {
  const client = new Client({
    name: "ai-document-assistant-backend",
    version: "1.0.0",
  });

  const transport = new StdioClientTransport({
    command: pythonPath,
    args: [mcpServerPath],
  });

  await client.connect(transport);

  return client;
}
