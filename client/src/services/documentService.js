//client/src/services/documentService.js
export async function fetchDocuments() {
  const response = await fetch("/api/documents");

  if (!response.ok) {
    throw new Error("Failed to fetch documents.");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error("Unable to retrieve documents.");
  }

  return data.documents;
}
