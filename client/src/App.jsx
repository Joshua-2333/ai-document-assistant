// client/src/App.jsx
import { useEffect, useState } from "react";
import DocumentList from "./components/DocumentList";
import DocumentViewer from "./components/DocumentViewer";
import {
  fetchDocuments,
  fetchDocumentContent,
} from "./services/documentService";
import "./App.css";

function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentContent, setDocumentContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState("");
  const [contentError, setContentError] = useState("");

  useEffect(() => {
    async function loadDocuments() {
      try {
        const data = await fetchDocuments();
        setDocuments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, []);

  async function handleSelectDocument(filename) {
    setSelectedDocument(filename);
    setDocumentContent("");
    setContentError("");
    setContentLoading(true);

    try {
      const content = await fetchDocumentContent(filename);
      setDocumentContent(content);
    } catch (err) {
      setContentError(err.message);
    } finally {
      setContentLoading(false);
    }
  }

  return (
    <main>
      <h1>AI Document Assistant</h1>

      {loading && <p>Loading documents...</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && (
        <>
          <DocumentList
            documents={documents}
            selectedDocument={selectedDocument}
            onSelectDocument={handleSelectDocument}
          />

          <DocumentViewer
            selectedDocument={selectedDocument}
            documentContent={documentContent}
            loading={contentLoading}
            error={contentError}
          />
        </>
      )}
    </main>
  );
}

export default App;
