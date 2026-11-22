// client/src/App.jsx
import { useEffect, useRef, useState } from "react";
import DocumentList from "./components/DocumentList";
import DocumentViewer from "./components/DocumentViewer";
import DocumentSearch from "./components/DocumentSearch";
import DocumentChat from "./components/DocumentChat";
import DocumentUpload from "./components/DocumentUpload";
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

  // Track the most recent document request
  const latestRequestId = useRef(0);

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

  // Find the original filename for the selected document
  const selectedDocumentInfo = documents.find(
    (document) => document.filename === selectedDocument
  );

  const selectedOriginalName =
    selectedDocumentInfo?.originalName ?? selectedDocument;

  async function handleSelectDocument(filename) {
    // Assign a unique ID to each request
    const requestId = ++latestRequestId.current;

    setSelectedDocument(filename);
    setDocumentContent("");
    setContentError("");
    setContentLoading(true);

    try {
      const content = await fetchDocumentContent(filename);

      // Ignore responses from older requests
      if (requestId !== latestRequestId.current) {
        return;
      }

      setDocumentContent(content);
    } catch (err) {
      // Ignore errors from older requests
      if (requestId !== latestRequestId.current) {
        return;
      }

      setContentError(err.message);
    } finally {
      // Only the latest request can update loading state
      if (requestId === latestRequestId.current) {
        setContentLoading(false);
      }
    }
  }

  // Refresh the document list after a successful upload
  async function handleUploadSuccess(document) {
    const updatedDocuments = await fetchDocuments();

    setDocuments(updatedDocuments);
    setError("");

    // Automatically open the newly uploaded document
    await handleSelectDocument(document.filename);
  }

  return (
    <main className="app-container">
      <header className="app-header">
        <h1>AI Document Assistant</h1>
        <p>
          Upload, search, read, and ask AI questions about your documents.
        </p>
      </header>

      <div className="app-dashboard">
        <div className="app-sidebar">
          <DocumentUpload onUploadSuccess={handleUploadSuccess} />

          {loading && <p role="status">Loading documents...</p>}

          {error && <p role="alert">{error}</p>}

          {!loading && !error && (
            <>
              <DocumentSearch
                documents={documents}
                onSelectDocument={handleSelectDocument}
              />

              <DocumentList
                documents={documents}
                selectedDocument={selectedDocument}
                onSelectDocument={handleSelectDocument}
              />
            </>
          )}
        </div>

        <div className="app-workspace">
          {!loading && !error && (
            <>
              {selectedDocument ? (
                <>
                  <DocumentViewer
                    selectedDocument={selectedDocument}
                    originalName={selectedOriginalName}
                    documentContent={documentContent}
                    loading={contentLoading}
                    error={contentError}
                  />

                  <DocumentChat
                    key={selectedDocument}
                    selectedDocument={selectedDocument}
                    originalName={selectedOriginalName}
                  />
                </>
              ) : (
                <section
                  className="app-empty-state"
                  aria-labelledby="empty-state-heading"
                >
                  <h2 id="empty-state-heading">
                    No Document Selected
                  </h2>
                  <p>
                    Select a document from the list or upload a new
                    document to start reading and asking questions.
                  </p>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
