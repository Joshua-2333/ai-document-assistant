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

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
