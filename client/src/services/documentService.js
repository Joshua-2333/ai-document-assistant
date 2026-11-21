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

export async function fetchDocumentContent(filename) {
  const response = await fetch(
    `/api/documents/${encodeURIComponent(filename)}`
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to read document.");
  }

  return data.content;
}

export async function searchDocuments(query) {
  const response = await fetch(
    `/api/documents/search?query=${encodeURIComponent(query)}`
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to search documents.");
  }

  return data.results;
}

export async function askDocumentQuestion(filename, question) {
  const response = await fetch("/api/documents/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename,
      question,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "Unable to answer the document question."
    );
  }

  return data.answer;
}
