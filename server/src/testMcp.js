// server/src/testMcp.js
import { connectMcpServer } from "./services/mcpClient.js";

async function main() {
  let client;

  try {
    client = await connectMcpServer();

    console.log("Connected to Python MCP server!");

    // Get available MCP tools
    const tools = await client.listTools();

    console.log("\nAvailable MCP tools:");

    for (const tool of tools.tools) {
      console.log(`- ${tool.name}`);
    }

    // Call the Python list_documents tool
    const result = await client.callTool({
      name: "list_documents",
      arguments: {},
    });

    console.log("\nDocuments returned from Python:");
    console.log(result.content);

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
