// server/src/index.js
import express from "express";
import helmet from "helmet";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

const clientOrigin =
  process.env.CLIENT_ORIGIN ||
  (isProduction ? null : "http://localhost:5173");

if (!clientOrigin) {
  throw new Error("CLIENT_ORIGIN is not configured.");
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
      // Allow requests without a browser origin
      if (!origin) {
        return callback(null, true);
      }

      // Allow the configured frontend origin
      if (origin === clientOrigin) {
        return callback(null, true);
      }

      const error = new Error("Origin not allowed.");
      error.status = 403;

      return callback(error);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
    maxAge: 600,
  })
);

// Middleware
app.use(express.json());

// API routes
app.use("/api/health", healthRoutes);
app.use("/api/documents", documentRoutes);

// Handle unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found.",
  });
});

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

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});