// server/src/db/initDb.js
import { readFile } from "node:fs/promises";
import { pool } from "./pool.js";

async function initializeDatabase() {
  try {
    console.log("Initializing database...");

    // Read the SQL schema
    const schema = await readFile(
      new URL("./schema.sql", import.meta.url),
      "utf8"
    );

    // Execute the database schema
    await pool.query(schema);

    // Define the required database tables
    const requiredTables = [
      "ai_usage",
      "documents",
    ];

    // Verify that all required tables exist
    const result = await pool.query(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name = ANY($1::text[])
      `,
      [requiredTables]
    );

    const existingTables = new Set(
      result.rows.map((row) => row.table_name)
    );

    // Identify any missing tables
    const missingTables = requiredTables.filter(
      (table) => !existingTables.has(table)
    );

    if (missingTables.length > 0) {
      throw new Error(
        `Missing database tables: ${missingTables.join(", ")}`
      );
    }

    console.log("Database initialized successfully.");

    // Display each verified table
    for (const table of requiredTables) {
      console.log("Table verified:", table);
    }
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

await initializeDatabase();