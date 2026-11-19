// server/src/routes/documentRoutes.js
import { Router } from "express";
import {
  getDocuments,
  getDocumentContent,
} from "../controllers/documentController.js";

const router = Router();

// GET /api/documents
router.get("/", getDocuments);

// GET /api/documents/:filename
router.get("/:filename", getDocumentContent);

export default router;
