// server/src/controllers/documentController.js
import { connectMcpServer } from "../services/mcpClient.js";

export async function getDocuments(req, res) {
  let client;

  try {
    // Connect to the Python MCP server
    client = await connectMcpServer();

    // Call the Python list_documents tool
    const result = await client.callTool({
      name: "list_documents",
      arguments: {},
    });

    if (result.isError) {
      throw new Error("MCP document tool failed.");
    }

    // Extract the document list from the MCP response
    const textContent = result.content.find(
      (item) => item.type === "text"
    );

    if (!textContent) {
      throw new Error("No document data returned from MCP.");
    }

    const documents = JSON.parse(textContent.text);

    // Return the document list to the frontend
    res.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch documents.",
    });
  } finally {
    // Close the MCP connection
    if (client) {
      await client.close();
    }
  }
}
