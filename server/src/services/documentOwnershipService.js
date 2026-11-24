// server/src/services/documentOwnershipService.js
import { pool } from "../db/pool.js";
import { unlink, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Private document storage directory
const documentsDirectory = fileURLToPath(
  new URL("../../../mcp-server/documents/", import.meta.url)
);

// Public sample document directory
const sampleDocumentsDirectory = fileURLToPath(
  new URL("../../../mcp-server/sample-documents/", import.meta.url)
);

// Public sample documents
const sampleDocuments = Object.freeze({
  "company-handbook.pdf": "Company Handbook.pdf",
  "product-inventory.txt": "Product Inventory.txt",
  "software-documentation.md": "Software Documentation.md",
});

// Document storage limits
export const documentLimits = Object.freeze({
  maxFileSize: 10 * 1024 * 1024,
  maxDocumentsPerSession: 5,
  maxStoragePerSession: 50 * 1024 * 1024,
  maxGlobalStorage: 200 * 1024 * 1024,
  retentionHours: 24,
});

// Create an HTTP error
function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Validate the hashed session identifier
function validateSessionId(sessionId) {
  if (
    typeof sessionId !== "string" ||
    !/^[a-f0-9]{64}$/.test(sessionId)
  ) {
    throw createError("Invalid document session.", 400);
  }
}

// Validate the UUID-based stored filename
function validateFilename(filename) {
  const filenamePattern =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(pdf|txt|md)$/;

  if (
    typeof filename !== "string" ||
    !filenamePattern.test(filename)
  ) {
    throw createError("Invalid document filename.", 400);
  }
}

// Check whether a filename belongs to a public sample
function isSampleDocument(filename) {
  return (
    typeof filename === "string" &&
    Object.hasOwn(sampleDocuments, filename)
  );
}

// Retrieve metadata for a public sample document
async function getSampleDocument(filename) {
  if (!isSampleDocument(filename)) {
    throw createError("Document not found.", 404);
  }

  const filePath = path.join(
    sampleDocumentsDirectory,
    filename
  );

  try {
    const fileInfo = await lstat(filePath);

    // Reject symbolic links and invalid files
    if (!fileInfo.isFile()) {
      throw createError("Document not found.", 404);
    }

    return {
      filename,
      originalName: sampleDocuments[filename],
      size: fileInfo.size,
      createdAt: fileInfo.mtime.toISOString(),
      expiresAt: null,
      isSample: true,
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      throw createError("Document not found.", 404);
    }

    throw error;
  }
}

// Retrieve all available public sample documents
async function getSampleDocuments() {
  const documents = [];

  for (const filename of Object.keys(sampleDocuments)) {
    try {
      const document = await getSampleDocument(filename);

      documents.push(document);
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }

      console.warn("Sample document unavailable:", filename);
    }
  }

  return documents;
}

// Create an error for document storage restrictions
function createStorageLimitError(message) {
  return createError(message, 429);
}

// Retrieve document storage usage for a specific session
export async function getSessionStorageUsage(
  sessionId,
  db = pool
) {
  validateSessionId(sessionId);

  const result = await db.query(
    `
    SELECT
      COUNT(*)::INTEGER AS document_count,
      COALESCE(SUM(size_bytes), 0) AS total_bytes
    FROM documents
    WHERE session_id = $1
    `,
    [sessionId]
  );

  return {
    documentCount: result.rows[0].document_count,
    totalBytes: Number(result.rows[0].total_bytes),
  };
}

// Retrieve total application document storage usage
export async function getGlobalStorageUsage(db = pool) {
  const result = await db.query(`
    SELECT
      COUNT(*)::INTEGER AS document_count,
      COALESCE(SUM(size_bytes), 0) AS total_bytes
    FROM documents
  `);

  return {
    documentCount: result.rows[0].document_count,
    totalBytes: Number(result.rows[0].total_bytes),
  };
}

// Reserve document storage before accepting an upload
export async function reserveDocumentStorage(
  sessionId,
  filename,
  originalName
) {
  validateSessionId(sessionId);
  validateFilename(filename);

  // Validate the original display filename
  if (
    typeof originalName !== "string" ||
    !originalName.trim() ||
    originalName.length > 255
  ) {
    throw createError("Invalid original filename.", 400);
  }

  // Reserve the maximum allowed file size
  const reservedBytes = documentLimits.maxFileSize;

  const client = await pool.connect();

  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");

    // Prevent simultaneous storage reservations
    await client.query(
      "SELECT pg_advisory_xact_lock($1)",
      [482902]
    );

    // Retrieve current session storage usage
    const sessionUsage = await getSessionStorageUsage(
      sessionId,
      client
    );

    // Enforce the maximum document count
    if (
      sessionUsage.documentCount >=
      documentLimits.maxDocumentsPerSession
    ) {
      throw createStorageLimitError(
        "You have reached your document limit."
      );
    }

    // Enforce the session storage limit
    if (
      sessionUsage.totalBytes + reservedBytes >
      documentLimits.maxStoragePerSession
    ) {
      throw createStorageLimitError(
        "You have reached your document storage limit."
      );
    }

    // Retrieve global application storage usage
    const globalUsage = await getGlobalStorageUsage(client);

    // Enforce the global storage limit
    if (
      globalUsage.totalBytes + reservedBytes >
      documentLimits.maxGlobalStorage
    ) {
      throw createStorageLimitError(
        "Application document storage is currently full."
      );
    }

    // Create a pending document reservation
    const result = await client.query(
      `
      INSERT INTO documents (
        filename,
        original_name,
        session_id,
        size_bytes,
        status
      )
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING
        id,
        filename,
        size_bytes,
        status,
        expires_at
      `,
      [
        filename,
        originalName.trim(),
        sessionId,
        reservedBytes,
      ]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Activate a successfully uploaded and validated document
export async function activateDocument(
  sessionId,
  filename,
  actualSizeBytes
) {
  validateSessionId(sessionId);
  validateFilename(filename);

  // Validate the actual uploaded file size
  if (
    !Number.isSafeInteger(actualSizeBytes) ||
    actualSizeBytes <= 0 ||
    actualSizeBytes > documentLimits.maxFileSize
  ) {
    throw createError("Invalid document size.", 400);
  }

  // Activate the document and update its actual storage size
  const result = await pool.query(
    `
    UPDATE documents
    SET
      size_bytes = $3,
      status = 'active',
      expires_at = NOW() + ($4::integer * INTERVAL '1 hour')
    WHERE session_id = $1
      AND filename = $2
      AND status = 'pending'
      AND expires_at > NOW()
      AND size_bytes >= $3
    RETURNING
      id,
      filename,
      original_name,
      size_bytes,
      status,
      created_at,
      expires_at
    `,
    [
      sessionId,
      filename,
      actualSizeBytes,
      documentLimits.retentionHours,
    ]
  );

  // Ensure a valid pending reservation was activated
  if (result.rowCount !== 1) {
    throw createError(
      "Valid document reservation not found.",
      409
    );
  }

  return result.rows[0];
}

// Retrieve public samples and documents belonging to the current session
export async function getAuthorizedDocuments(sessionId) {
  validateSessionId(sessionId);

  // Retrieve public sample documents
  const publicDocuments = await getSampleDocuments();

  // Retrieve private documents belonging to the current session
  const result = await pool.query(
    `
    SELECT
      filename,
      original_name AS "originalName",
      size_bytes AS size,
      created_at AS "createdAt",
      expires_at AS "expiresAt"
    FROM documents
    WHERE session_id = $1
      AND status = 'active'
      AND expires_at > NOW()
    ORDER BY created_at DESC, id DESC
    `,
    [sessionId]
  );

  const privateDocuments = result.rows.map((document) => ({
    ...document,
    size: Number(document.size),
    isSample: false,
  }));

  // Display public samples before private uploads
  return [
    ...publicDocuments,
    ...privateDocuments,
  ];
}

// Verify access to a public sample or private document
export async function verifyDocumentOwnership(
  sessionId,
  filename
) {
  validateSessionId(sessionId);

  // Public samples are accessible to every session
  if (isSampleDocument(filename)) {
    return await getSampleDocument(filename);
  }

  // Private documents must use a valid UUID-based filename
  validateFilename(filename);

  const result = await pool.query(
    `
    SELECT
      filename,
      original_name AS "originalName",
      size_bytes AS size,
      created_at AS "createdAt",
      expires_at AS "expiresAt"
    FROM documents
    WHERE session_id = $1
      AND filename = $2
      AND status = 'active'
      AND expires_at > NOW()
    `,
    [sessionId, filename]
  );

  // Do not reveal whether another session owns the document
  if (result.rowCount !== 1) {
    throw createError("Document not found.", 404);
  }

  return {
    ...result.rows[0],
    size: Number(result.rows[0].size),
    isSample: false,
  };
}

// Remove a physical private document from storage
async function removeStoredFile(filename) {
  validateFilename(filename);

  const filePath = path.join(
    documentsDirectory,
    filename
  );

  try {
    await unlink(filePath);
  } catch (error) {
    // A missing file is already considered removed
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

// Remove a failed upload and release its storage reservation
// Call only after the upload stream has finished or closed
export async function cancelDocumentReservation(
  sessionId,
  filename
) {
  validateSessionId(sessionId);
  validateFilename(filename);

  // Mark the pending reservation for deletion
  const result = await pool.query(
    `
    UPDATE documents
    SET status = 'deleting'
    WHERE session_id = $1
      AND filename = $2
      AND status = 'pending'
    RETURNING filename
    `,
    [sessionId, filename]
  );

  if (result.rowCount !== 1) {
    return false;
  }

  // Remove the physical file before releasing storage
  await removeStoredFile(filename);

  // Remove the database reservation
  await pool.query(
    `
    DELETE FROM documents
    WHERE session_id = $1
      AND filename = $2
      AND status = 'deleting'
    `,
    [sessionId, filename]
  );

  return true;
}

// Remove expired private documents and retry unfinished deletions
export async function cleanupExpiredDocuments() {
  // Mark expired active documents for deletion
  await pool.query(`
    UPDATE documents
    SET status = 'deleting'
    WHERE expires_at <= NOW()
      AND status = 'active'
  `);

  // Retrieve documents awaiting physical removal
  const result = await pool.query(`
    SELECT id, filename
    FROM documents
    WHERE status = 'deleting'
    ORDER BY id
  `);

  let removedCount = 0;
  let failedCount = 0;

  for (const document of result.rows) {
    try {
      // Remove the physical document first
      await removeStoredFile(document.filename);

      // Release storage only after successful file removal
      const deletion = await pool.query(
        `
        DELETE FROM documents
        WHERE id = $1
          AND status = 'deleting'
        `,
        [document.id]
      );

      removedCount += deletion.rowCount;
    } catch (error) {
      failedCount++;

      console.error("Document cleanup failed:", {
        documentId: document.id,
        name: error.name,
        code: error.code,
      });
    }
  }

  return {
    removedCount,
    failedCount,
  };
}

// Recover abandoned uploads and missing files on startup
export async function recoverDocumentStorage() {
  // Recover pending uploads left by a previous server process
  await pool.query(`
    UPDATE documents
    SET status = 'deleting'
    WHERE status = 'pending'
  `);

  // Retrieve active documents
  const result = await pool.query(`
    SELECT id, filename
    FROM documents
    WHERE status = 'active'
  `);

  // Check whether each active document still exists
  for (const document of result.rows) {
    validateFilename(document.filename);

    const filePath = path.join(
      documentsDirectory,
      document.filename
    );

    try {
      const fileInfo = await lstat(filePath);

      if (!fileInfo.isFile()) {
        throw new Error("Invalid stored document.");
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }

      // Mark missing documents for cleanup
      await pool.query(
        `
        UPDATE documents
        SET status = 'deleting'
        WHERE id = $1
          AND status = 'active'
        `,
        [document.id]
      );
    }
  }

  return await cleanupExpiredDocuments();
}