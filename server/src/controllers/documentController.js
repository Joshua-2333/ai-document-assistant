// server/src/controllers/documentController.js
import { connectMcpServer } from "../services/mcpClient.js";
import { askDocument } from "../services/documentAiService.js";

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

export async function getDocumentContent(req, res) {
  let client;

  try {
    const { filename } = req.params;

    // Connect to the Python MCP server
    client = await connectMcpServer();

    // Call the Python read_document tool
    const result = await client.callTool({
      name: "read_document",
      arguments: { filename },
    });

    if (result.isError) {
      throw new Error("MCP document reading failed.");
    }

    // Extract the document content
    const textContent = result.content.find(
      (item) => item.type === "text"
    );

    if (!textContent) {
      throw new Error("No document content returned from MCP.");
    }

    const content = textContent.text;

    // Handle errors returned by the Python tool
    if (content.startsWith("Error:")) {
      return res.status(400).json({
        success: false,
        message: content,
      });
    }

    // Return document content to React
    return res.json({
      success: true,
      filename,
      content,
    });
  } catch (error) {
    console.error("Error reading document:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to read document.",
    });
  } finally {
    // Close the MCP connection
    if (client) {
      await client.close();
    }
  }
}

export async function searchDocuments(req, res) {
  let client;

  try {
    const { query } = req.query;

    // Validate the search query
    if (typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: "A search query is required.",
      });
    }

    // Connect to the Python MCP server
    client = await connectMcpServer();

    // Call the Python search_documents tool
    const result = await client.callTool({
      name: "search_documents",
      arguments: {
        query: query.trim(),
      },
    });

    if (result.isError) {
      throw new Error("MCP document search failed.");
    }

    // Extract the search results
    const textContent = result.content.find(
      (item) => item.type === "text"
    );

    if (!textContent) {
      throw new Error("No search results returned from MCP.");
    }

    const results = JSON.parse(textContent.text);

    // Return search results to React
    return res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error searching documents:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to search documents.",
    });
  } finally {
    // Close the MCP connection
    if (client) {
      await client.close();
    }
  }
}

export async function askDocumentQuestion(req, res) {
  try {
    const { filename, question } = req.body;

    if (
      typeof filename !== "string" ||
      !filename.trim() ||
      typeof question !== "string" ||
      !question.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "A filename and question are required.",
      });
    }

    const answer = await askDocument(
      filename.trim(),
      question.trim()
    );

    return res.json({
      success: true,
      filename: filename.trim(),
      question: question.trim(),
      answer,
    });
  } catch (error) {
    console.error("Error asking document question:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to answer the document question.",
    });
  }
}
