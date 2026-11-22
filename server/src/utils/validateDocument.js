// server/src/utils/validateDocument.js
import { open } from "node:fs/promises";
import path from "node:path";

// Verify that a file has a PDF header
async function isValidPdf(filePath) {
  const file = await open(filePath, "r");

  try {
    const buffer = Buffer.alloc(5);
    const { bytesRead } = await file.read(buffer, 0, 5, 0);

    return (
      bytesRead === 5 &&
      buffer.toString("ascii") === "%PDF-"
    );
  } finally {
    await file.close();
  }
}

// Verify that a file contains valid UTF-8 text
async function isValidText(filePath) {
  const file = await open(filePath, "r");

  try {
    const buffer = await file.readFile();

    const decoder = new TextDecoder("utf-8", {
      fatal: true,
    });

    const content = decoder.decode(buffer);

    // Reject binary files containing null bytes
    return !content.includes("\0");
  } catch (error) {
    if (error instanceof TypeError) {
      return false;
    }

    throw error;
  } finally {
    await file.close();
  }
}

// Validate a document based on its extension
export async function validateDocument(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".pdf":
      return isValidPdf(filePath);

    case ".txt":
    case ".md":
      return isValidText(filePath);

    default:
      return false;
  }
}
