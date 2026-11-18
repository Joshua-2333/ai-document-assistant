// server/src/testMcp.js
import { connectMcpServer } from "./services/mcpClient.js";

async function main() {
  let client;

  try {
    client = await connectMcpServer();

    console.log("Connected to Python MCP server!");

    const result = await client.listTools();

    console.log("Available MCP tools:");

    for (const tool of result.tools) {
      console.log(`- ${tool.name}`);
    }
  } catch (error) {
    console.error("MCP connection failed:", error);
    process.exitCode = 1;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

main();
