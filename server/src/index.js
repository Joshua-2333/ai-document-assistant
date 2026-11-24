// server/src/index.js
import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import healthRoutes from "./routes/healthRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import { apiLimiter } from "./middleware/rateLimitMiddleware.js";

import {
  cleanupExpiredDocuments,
  recoverDocumentStorage,
} from "./services/documentOwnershipService.js";

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

// Resolve the React production build directory
const clientDirectory = fileURLToPath(
  new URL("../../client/dist/", import.meta.url)
);

const clientOrigin =
  process.env.CLIENT_ORIGIN ||
  (isProduction ? null : "http://localhost:5173");

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

let cleanupRunning = false;

if (!clientOrigin) {
  throw new Error("CLIENT_ORIGIN is not configured.");
}

// Configure trusted reverse proxies
if (isProduction) {
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS);

  if (
    !Number.isInteger(proxyHops) ||
    proxyHops < 1 ||
    proxyHops > 3
  ) {
    throw new Error("Invalid TRUST_PROXY_HOPS configuration.");
  }

  app.set("trust proxy", proxyHops);
}

// Security middleware
app.disable("x-powered-by");

app.use(
  helmet({
    strictTransportSecurity: isProduction ? undefined : false,
    contentSecurityPolicy: {
      directives: {
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (origin === clientOrigin) {
        return callback(null, true);
      }

      const error = new Error("Origin not allowed.");
      error.status = 403;

      return callback(error);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
    maxAge: 600,
  })
);

// General API rate limiting
app.use("/api", apiLimiter);

// Request body parsing
app.use(express.json({ limit: "512kb" }));

// API routes
app.use("/api/health", healthRoutes);
app.use("/api/documents", documentRoutes);

// Handle unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found.",
  });
});

// Serve the React application in production
if (isProduction) {
  app.use(express.static(clientDirectory));

  // Support client-side navigation
  app.get("/{*splat}", (req, res) => {
    res.sendFile(
      path.join(clientDirectory, "index.html")
    );
  });
}

// Centralized error-handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", {
    name: err.name,
    status: err.status,
  });

  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status < 600
      ? err.status
      : 500;

  res.status(statusCode).json({
    error:
      statusCode >= 500
        ? "An unexpected server error occurred."
        : err.message || "Request failed.",
  });
});

// Automatically clean up expired documents
async function runDocumentCleanup() {
  // Prevent overlapping cleanup operations
  if (cleanupRunning) {
    return;
  }

  cleanupRunning = true;

  try {
    const result = await cleanupExpiredDocuments();

    if (result.removedCount > 0 || result.failedCount > 0) {
      console.log("Document cleanup completed:", result);
    }
  } catch (error) {
    console.error("Automatic document cleanup failed:", {
      name: error.name,
      code: error.code,
    });
  } finally {
    cleanupRunning = false;
  }
}

// Recover document storage before accepting requests
async function startServer() {
  try {
    const recovery = await recoverDocumentStorage();

    console.log("Document storage recovery completed:", recovery);

    // Schedule automatic document cleanup
    const cleanupTimer = setInterval(
      runDocumentCleanup,
      CLEANUP_INTERVAL_MS
    );

    cleanupTimer.unref();

    // Start the Express server
    app.listen(PORT, isProduction ? "0.0.0.0" : "localhost", () => {
      console.log(`Server running on port ${PORT}`);
      console.log("Environment:", process.env.NODE_ENV || "development");
      console.log("Automatic document cleanup enabled.");

      if (isProduction) {
        console.log("Serving React production build.");
      }
    });
  } catch (error) {
    console.error("Server startup failed:", {
      name: error.name,
      code: error.code,
    });

    process.exit(1);
  }
}

startServer();