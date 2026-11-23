// server/src/index.js
import express from "express";
import healthRoutes from "./routes/healthRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

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
  console.error("Server error:", err);

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
      statusCode === 500
        ? "An unexpected server error occurred."
        : err.message || "Request failed.",
  });
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
