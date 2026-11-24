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
import { identifySession } from "../middleware/sessionMiddleware.js";

import {
  aiLimiter,
  uploadLimiter,
} from "../middleware/rateLimitMiddleware.js";

import {
  cancelDocumentReservation,
} from "../services/documentOwnershipService.js";

const router = Router();

// Prevent caching of private document responses
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Identify the private session for all document endpoints
router.use(identifySession);

// Handle document uploads and failed reservations
function handleDocumentUpload(req, res, next) {
  uploadDocument.single("document")(
    req,
    res,
    async (error) => {
      if (!error) {
        return next();
      }

      // Release storage reserved for a failed upload
      const reservation = req.documentReservation;

      if (reservation) {
        try {
          await cancelDocumentReservation(
            reservation.sessionId,
            reservation.filename
          );
        } catch (cleanupError) {
          console.error("Upload reservation cleanup failed:", {
            name: cleanupError.name,
            code: cleanupError.code,
          });
        }
      }

      // Handle Multer upload restrictions
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            success: false,
            message: "File exceeds the 10 MB upload limit.",
          });
        }

        if (error.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({
            success: false,
            message: "Only one document may be uploaded at a time.",
          });
        }

        return res.status(400).json({
          success: false,
          message: "Invalid document upload request.",
        });
      }

      // Handle validation and storage limit errors
      if (
        Number.isInteger(error.status) &&
        error.status >= 400 &&
        error.status < 500
      ) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
        });
      }

      // Avoid exposing internal server details
      console.error("Document upload failed:", {
        name: error.name,
        code: error.code,
      });

      return res.status(500).json({
        success: false,
        message: "Unable to upload document.",
      });
    }
  );
}

// Retrieve documents belonging to the current session
router.get("/", getDocuments);

// Search authorized documents
router.get("/search", searchDocuments);

// Ask the AI about an authorized document
router.post(
  "/ask",
  aiLimiter,
  identifyVisitor,
  askDocumentQuestion
);

// Upload and validate a new document
router.post(
  "/upload",
  uploadLimiter,
  handleDocumentUpload,
  uploadDocumentFile
);

// Retrieve an individual authorized document
router.get("/:filename", getDocumentContent);

export default router;