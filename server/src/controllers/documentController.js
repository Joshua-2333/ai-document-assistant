// server/src/controllers/documentController.js
import { connectMcpServer } from "../services/mcpClient.js";
import { askDocument } from "../services/documentAiService.js";
import { validateDocument } from "../utils/validateDocument.js";

import {
  getAuthorizedDocuments,
  verifyDocumentOwnership,
  activateDocument,
  cancelDocumentReservation,
} from "../services/documentOwnershipService.js";

// Return a standardized error response
function sendError(res, error, fallbackMessage) {
  console.error(fallbackMessage, {
    name: error.name,
    status: error.status ?? error.statusCode,
  });

  const status = error.status ?? error.statusCode;

  if (
    Number.isInteger(status) &&
    status >= 400 &&
    status < 500
  ) {
    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
}

// Close an MCP connection safely
async function closeMcpClient(client) {
  if (!client) return;

  try {
    await client.close();
  } catch (error) {
    console.error("Error closing MCP connection:", {
      name: error.name,
    });
  }
}

// Clean up a failed document upload
async function cleanupFailedUpload(req) {
  const reservation = req.documentReservation;

  if (!reservation) return;

  try {
    await cancelDocumentReservation(
      reservation.sessionId,
      reservation.filename
    );
  } catch (error) {
    console.error("Document upload cleanup failed:", {
      name: error.name,
      code: error.code,
    });
  }
}

// Retrieve documents belonging to the current session
export async function getDocuments(req, res) {
  try {
    const documents = await getAuthorizedDocuments(
      req.sessionId
    );

    return res.json({
      success: true,
      documents,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to fetch documents."
    );
  }
}

// Read an authorized document
export async function getDocumentContent(req, res) {
  let client;

  try {
    const { filename } = req.params;

    // Verify ownership before accessing the MCP server
    await verifyDocumentOwnership(
      req.sessionId,
      filename
    );

    client = await connectMcpServer();

    const result = await client.callTool({
      name: "read_document",
      arguments: { filename },
    });

    if (result.isError) {
      throw new Error("MCP document reading failed.");
    }

    const textContent = result.content.find(
      (item) => item.type === "text"
    );

    if (!textContent) {
      throw new Error(
        "No document content returned from MCP."
      );
    }

    const content = textContent.text;

    // Handle errors returned by the Python MCP server
    if (content.startsWith("Error:")) {
      if (content === "Error: Document not found.") {
        return res.status(404).json({
          success: false,
          message: "Document not found.",
        });
      }

      if (content === "Error: Access denied.") {
        return res.status(403).json({
          success: false,
          message: "Access denied.",
        });
      }

      if (
        content === "Error: Unsupported file format."
      ) {
        return res.status(400).json({
          success: false,
          message: "Unsupported file format.",
        });
      }

      throw new Error("Unable to read document.");
    }

    return res.json({
      success: true,
      filename,
      content,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to read document."
    );
  } finally {
    await closeMcpClient(client);
  }
}

// Search only documents belonging to the current session
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

    if (query.length > 1000) {
      return res.status(400).json({
        success: false,
        message:
          "Search query must be 1,000 characters or fewer.",
      });
    }

    // Retrieve authorized documents
    const documents = await getAuthorizedDocuments(
      req.sessionId
    );

    const authorizedFilenames = documents.map(
      (document) => document.filename
    );

    // Avoid unnecessary MCP requests
    if (authorizedFilenames.length === 0) {
      return res.json({
        success: true,
        results: [],
      });
    }

    client = await connectMcpServer();

    // Search only authorized filenames
    const result = await client.callTool({
      name: "search_documents",
      arguments: {
        query: query.trim(),
        filenames: authorizedFilenames,
      },
    });

    if (result.isError) {
      throw new Error("MCP document search failed.");
    }

    const textContent = result.content.find(
      (item) => item.type === "text"
    );

    if (!textContent) {
      throw new Error(
        "No search results returned from MCP."
      );
    }

    const results = JSON.parse(textContent.text);

    if (!Array.isArray(results)) {
      throw new Error("Invalid MCP search results.");
    }

    // Additional protection against unauthorized results
    const authorizedSet = new Set(authorizedFilenames);

    const authorizedResults = results.filter(
      (item) =>
        item &&
        authorizedSet.has(item.filename)
    );

    return res.json({
      success: true,
      results: authorizedResults,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to search documents."
    );
  } finally {
    await closeMcpClient(client);
  }
}

// Ask the AI a question about an authorized document
export async function askDocumentQuestion(req, res) {
  try {
    const {
      filename,
      question,
      history = [],
    } = req.body ?? {};

    // Validate the filename and question
    if (
      typeof filename !== "string" ||
      !filename.trim() ||
      typeof question !== "string" ||
      !question.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A filename and question are required.",
      });
    }

    // Limit question length
    if (question.length > 10000) {
      return res.status(400).json({
        success: false,
        message:
          "Question must be 10,000 characters or fewer.",
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

    // Remove unexpected properties from conversation history
    const sanitizedHistory = history.map(
      (message) => ({
        role: message.role,
        content: message.content,
      })
    );

    // Verify document ownership before making an AI request
    await verifyDocumentOwnership(
      req.sessionId,
      filename.trim()
    );

    // Retrieve the visitor identifier for AI usage tracking
    const visitorId = req.visitorId;

    if (
      process.env.AI_PROVIDER === "anthropic" &&
      !visitorId
    ) {
      throw new Error(
        "Visitor identification is required."
      );
    }

    // Generate an answer using the configured AI provider
    const answer = await askDocument(
      filename.trim(),
      question.trim(),
      sanitizedHistory,
      visitorId
    );

    return res.json({
      success: true,
      filename: filename.trim(),
      question: question.trim(),
      answer,
    });
  } catch (error) {
    // Handle missing documents
    if (
      error.message === "Error: Document not found."
    ) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
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
        message:
          "Ollama took too long to respond.",
      });
    }

    // Handle unsuccessful Ollama responses
    if (error.statusCode === 502) {
      return res.status(502).json({
        success: false,
        message:
          "Ollama failed to generate a response.",
      });
    }

    // Includes ownership, token, request, and budget errors
    return sendError(
      res,
      error,
      "Unable to answer the document question."
    );
  }
}

// Validate and activate an uploaded document
export async function uploadDocumentFile(req, res) {
  try {
    // Ensure Multer received a document
    if (!req.file) {
      await cleanupFailedUpload(req);

      return res.status(400).json({
        success: false,
        message:
          "Please select a document to upload.",
      });
    }

    const reservation = req.documentReservation;

    // Verify that a matching storage reservation exists
    if (
      !reservation ||
      reservation.filename !== req.file.filename ||
      reservation.sessionId !== req.sessionId
    ) {
      throw new Error(
        "Valid document reservation is required."
      );
    }

    // Validate the actual uploaded file contents
    const isValid = await validateDocument(
      req.file.path
    );

    if (!isValid) {
      await cleanupFailedUpload(req);

      return res.status(400).json({
        success: false,
        message:
          "Invalid or unsupported document contents.",
      });
    }

    // Activate the document and record its actual size
    const document = await activateDocument(
      req.sessionId,
      req.file.filename,
      req.file.size
    );

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully.",
      document: {
        filename: document.filename,
        originalName: document.original_name,
        size: Number(document.size_bytes),
        createdAt: document.created_at,
        expiresAt: document.expires_at,
      },
    });
  } catch (error) {
    await cleanupFailedUpload(req);

    return sendError(
      res,
      error,
      "Unable to upload document."
    );
  }
}