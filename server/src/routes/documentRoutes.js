// server/src/routes/documentRoutes.js

import { Router } from "express";
import {
  getDocuments,
  getDocumentContent,
  searchDocuments,
} from "../controllers/documentController.js";

const router = Router();

// GET /api/documents
router.get("/", getDocuments);

// GET /api/documents/search?query=Python
router.get("/search", searchDocuments);

// GET /api/documents/:filename
router.get("/:filename", getDocumentContent);

export default router;
