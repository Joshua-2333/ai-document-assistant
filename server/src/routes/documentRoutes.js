// server/src/routes/documentRoutes.js
import { Router } from "express";
import { getDocuments } from "../controllers/documentController.js";

const router = Router();

// GET /api/documents
router.get("/", getDocuments);

export default router;
