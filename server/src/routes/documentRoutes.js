// server/src/routes/documentRoutes.js
import { Router } from "express";
import {
  getDocuments,
  getDocumentContent,
  searchDocuments,
  askDocumentQuestion,
  uploadDocumentFile,
} from "../controllers/documentController.js";

import { uploadDocument } from "../middleware/uploadMiddleware.js";

const router = Router();

// Get all available documents
router.get("/", getDocuments);

// Search documents
router.get("/search", searchDocuments);

// Ask Qwen3 a question about a document
router.post("/ask", askDocumentQuestion);

// Upload a PDF, TXT, or Markdown document
router.post(
  "/upload",
  (req, res, next) => {
    uploadDocument.single("document")(req, res, (error) => {
      if (error) {
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
