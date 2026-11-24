// server/src/routes/documentRoutes.js
import { Router } from "express";
import multer from "multer";

import {
  getDocuments,
  getDocumentContent,
  searchDocuments,
  askDocumentQuestion,
  uploadDocumentFile,
} from "../controllers/documentController.js";

import { uploadDocument } from "../middleware/uploadMiddleware.js";
import { identifyVisitor } from "../middleware/visitorMiddleware.js";

const router = Router();

// Get all available documents
router.get("/", getDocuments);

// Search documents
router.get("/search", searchDocuments);

// Ask the configured AI provider a question about a document
router.post("/ask", identifyVisitor, askDocumentQuestion);

// Upload a PDF, TXT, or Markdown document
router.post(
  "/upload",
  (req, res, next) => {
    uploadDocument.single("document")(req, res, (error) => {
      if (error) {
        // Handle files exceeding the 10 MB upload limit
        if (
          error instanceof multer.MulterError &&
          error.code === "LIMIT_FILE_SIZE"
        ) {
          return res.status(413).json({
            success: false,
            message: "File exceeds the 10 MB upload limit.",
          });
        }

        // Handle other Multer errors and invalid file types
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      next();
    });
  },
  uploadDocumentFile
);

// Read a selected document
router.get("/:filename", getDocumentContent);

export default router;