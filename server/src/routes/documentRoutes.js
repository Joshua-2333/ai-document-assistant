// server/src/routes/documentRoutes.js

import { Router } from "express";
import {
  getDocuments,
  getDocumentContent,
  searchDocuments,
  askDocumentQuestion,
} from "../controllers/documentController.js";

const router = Router();

// Get all available documents
router.get("/", getDocuments);

// Search documents by keyword
router.get("/search", searchDocuments);

// Ask Qwen3 a question about a document
router.post("/ask", askDocumentQuestion);

// Read a specific document
router.get("/:filename", getDocumentContent);

export default router;
