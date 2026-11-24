// server/src/middleware/uploadMiddleware.js
import multer from "multer";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import {
  documentLimits,
  reserveDocumentStorage,
} from "../services/documentOwnershipService.js";

// Directory used by the Python MCP server
const documentsDirectory = fileURLToPath(
  new URL("../../../mcp-server/documents/", import.meta.url)
);

// Supported file extensions
const allowedExtensions = new Set([
  ".pdf",
  ".txt",
  ".md",
]);

// Configure where uploaded documents are saved
const storage = multer.diskStorage({
  destination(req, file, callback) {
    mkdir(documentsDirectory, { recursive: true })
      .then(() => callback(null, documentsDirectory))
      .catch((error) => callback(error));
  },

  filename(req, file, callback) {
    async function prepareUpload() {
      // Require a valid document session
      if (
        typeof req.sessionId !== "string" ||
        !/^[a-f0-9]{64}$/.test(req.sessionId)
      ) {
        const error = new Error(
          "Unable to identify document session."
        );

        error.status = 400;
        throw error;
      }

      // Extract a safe file extension
      const extension = path
        .extname(file.originalname)
        .toLowerCase();

      // Generate a unique stored filename
      const filename = `${randomUUID()}${extension}`;

      // Track the attempted reservation for error cleanup
      req.documentReservation = {
        filename,
        sessionId: req.sessionId,
      };

      // Reserve storage before writing the file
      await reserveDocumentStorage(
        req.sessionId,
        filename,
        file.originalname
      );

      return filename;
    }

    prepareUpload()
      .then((filename) => callback(null, filename))
      .catch((error) => callback(error));
  },
});

// Validate uploaded file types
function fileFilter(req, file, callback) {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (!allowedExtensions.has(extension)) {
    const error = new Error(
      "Unsupported file type. Only PDF, TXT, and Markdown files are allowed."
    );

    error.status = 400;

    return callback(error);
  }

  // Validate the original filename
  if (
    !file.originalname.trim() ||
    file.originalname.length > 255
  ) {
    const error = new Error("Invalid original filename.");
    error.status = 400;

    return callback(error);
  }

  callback(null, true);
}

// Configure Multer
export const uploadDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: documentLimits.maxFileSize,
    files: 1,
    fields: 0,
    parts: 2,
  },
});