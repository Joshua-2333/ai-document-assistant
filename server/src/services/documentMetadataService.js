//server/src/services/documentMetadataService.js
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const METADATA_PATH = path.resolve(
  __dirname,
  "../../../mcp-server/document-metadata.json"
);

// Read existing document metadata
export async function getDocumentMetadata() {
  const data = await readFile(METADATA_PATH, "utf-8");

  return JSON.parse(data);
}

// Save the original filename of an uploaded document
export async function saveDocumentMetadata(
  filename,
  originalName
) {
  const metadata = await getDocumentMetadata();

  metadata[filename] = {
    originalName,
  };

  await writeFile(
    METADATA_PATH,
    JSON.stringify(metadata, null, 2),
    "utf-8"
  );
}
