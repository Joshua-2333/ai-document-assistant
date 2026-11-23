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

    // Verify that the usage table exists
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'ai_usage'
    `);

    if (result.rowCount !== 1) {
      throw new Error("AI usage table was not created.");
    }

    console.log("Database initialized successfully.");
    console.log("Table verified:", result.rows[0].table_name);
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

await initializeDatabase();