// server/src/controllers/documentController.js
import { unlink } from "node:fs/promises";
import { connectMcpServer } from "../services/mcpClient.js";
import { askDocument } from "../services/documentAiService.js";
import {
  getDocumentMetadata,
  saveDocumentMetadata,
} from "../services/documentMetadataService.js";
import { validateDocument } from "../utils/validateDocument.js";

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

    const filenames = JSON.parse(textContent.text);

    // Read the saved original filenames
    const metadata = await getDocumentMetadata();

    // Combine stored filenames with display names
    const documents = filenames.map((filename) => ({
      filename,
      originalName: metadata[filename]?.originalName ?? filename,
    }));

    // Return document information to React
    return res.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch documents.",
    });
  } finally {
    // Close the MCP connection safely
    if (client) {
      try {
        await client.close();
      } catch (cleanupError) {
        console.error(
          "Error closing MCP connection:",
          cleanupError
        );
      }
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

    // Handle errors returned by the Python MCP tool
    if (content.startsWith("Error:")) {
      let statusCode = 500;
      let message = "Unable to read document.";

      if (content === "Error: Document not found.") {
        statusCode = 404;
        message = "Document not found.";
      } else if (content === "Error: Access denied.") {
        statusCode = 403;
        message = "Access denied.";
      } else if (content === "Error: Unsupported file format.") {
        statusCode = 400;
        message = "Unsupported file format.";
      }

      return res.status(statusCode).json({
        success: false,
        message,
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
    // Close the MCP connection safely
    if (client) {
      try {
        await client.close();
      } catch (cleanupError) {
        console.error(
          "Error closing MCP connection:",
          cleanupError
        );
      }
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
    // Close the MCP connection safely
    if (client) {
      try {
        await client.close();
      } catch (cleanupError) {
        console.error(
          "Error closing MCP connection:",
          cleanupError
        );
      }
    }
  }
}

export async function askDocumentQuestion(req, res) {
  try {
    const { filename, question, history = [] } = req.body ?? {};

    // Validate the filename and question
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

    // Limit the length of questions sent to the AI provider
    if (question.length > 10000) {
      return res.status(400).json({
        success: false,
        message: "Question must be 10,000 characters or fewer.",
      });
    }

    // Validate conversation history
    if (
      !Array.isArray(history) ||
      history.length > 20 ||
      !history.every(
        (message) =>
          message &&
          typeof message === "object" &&
          !Array.isArray(message) &&
          ["user", "assistant"].includes(message.role) &&
          typeof message.content === "string" &&
          message.content.length <= 10000
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation history.",
      });
    }

    // Remove unexpected properties from conversation messages
    const sanitizedHistory = history.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    // Retrieve the server-generated visitor ID
    const visitorId = req.visitorId;

    // Require visitor identification for paid AI requests
    if (
      process.env.AI_PROVIDER === "anthropic" &&
      !visitorId
    ) {
      return res.status(500).json({
        success: false,
        message: "Unable to identify visitor.",
      });
    }

    // Ask the configured AI provider
    const answer = await askDocument(
      filename.trim(),
      question.trim(),
      sanitizedHistory,
      visitorId
    );

    // Return the AI-generated answer to React
    return res.json({
      success: true,
      filename: filename.trim(),
      question: question.trim(),
      answer,
    });
  } catch (error) {
    // Avoid logging sensitive provider request details
    console.error("Error asking document question:", {
      name: error.name,
      status: error.status ?? error.statusCode,
    });

    // Handle missing documents
    if (error.message === "Error: Document not found.") {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    // Handle AI request and spending limits
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message: error.message,
      });
    }

    // Handle AI input token limits
    if (error.status === 413) {
      return res.status(413).json({
        success: false,
        message: error.message,
      });
    }

    // Handle Ollama connection failures
    if (error.statusCode === 503) {
      return res.status(503).json({
        success: false,
        message:
          "Unable to connect to Ollama. Make sure Ollama is running.",
      });
    }

    // Handle Ollama request timeouts
    if (error.statusCode === 504) {
      return res.status(504).json({
        success: false,
        message: "Ollama took too long to respond.",
      });
    }

    // Handle unsuccessful Ollama API responses
    if (error.statusCode === 502) {
      return res.status(502).json({
        success: false,
        message: "Ollama failed to generate a response.",
      });
    }

    // Handle other unexpected errors
    return res.status(500).json({
      success: false,
      message: "Unable to answer the document question.",
    });
  }
}

export async function uploadDocumentFile(req, res) {
  try {
    // Check whether Multer received a file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a document to upload.",
      });
    }

    // Validate the actual uploaded file contents
    const isValid = await validateDocument(req.file.path);

    if (!isValid) {
      // Delete the invalid uploaded file
      await unlink(req.file.path);

      return res.status(400).json({
        success: false,
        message: "Invalid document content or file format.",
      });
    }

    // Save the original filename in document metadata
    await saveDocumentMetadata(
      req.file.filename,
      req.file.originalname
    );

    // Return information about the uploaded document
    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully.",
      document: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error("Error uploading document:", error);

    // Remove the uploaded file if an error occurs
    if (req.file?.path) {
      try {
        await unlink(req.file.path);
      } catch (cleanupError) {
        console.error(
          "Error removing uploaded file:",
          cleanupError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message: "Unable to upload document.",
    });
  }
}