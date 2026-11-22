// server/src/middleware/uploadMiddleware.js
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory used by the Python MCP server
const documentsDirectory = path.resolve(
  __dirname,
  "../../../mcp-server/documents"
);

// Maximum upload size: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Supported file extensions
const allowedExtensions = new Set([
  ".pdf",
  ".txt",
  ".md",
]);

// Configure where uploaded documents are saved
const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, documentsDirectory);
  },

  filename(req, file, callback) {
    // Extract a safe extension from the original filename
    const extension = path.extname(file.originalname).toLowerCase();

    // Generate a unique filename to prevent overwriting files
    const filename = `${randomUUID()}${extension}`;

    callback(null, filename);
  },
});

// Validate uploaded file types
function fileFilter(req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.has(extension)) {
    return callback(
      new Error(
        "Unsupported file type. Only PDF, TXT, and Markdown files are allowed."
      )
    );
  }

  callback(null, true);
}

// Configure Multer
export const uploadDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});
