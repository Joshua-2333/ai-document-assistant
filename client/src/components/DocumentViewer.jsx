// client/src/components/DocumentViewer.jsx

function DocumentViewer({
  selectedDocument,
  originalName,
  documentContent,
  loading,
  error,
}) {
  if (!selectedDocument) {
    return null;
  }

  return (
    <section
      className="document-viewer-section"
      aria-labelledby="selected-document-heading"
    >
      <h2 id="selected-document-heading">
        Selected Document
      </h2>

      <div className="document-viewer-header">
        <span
          className="document-viewer-icon"
          aria-hidden="true"
        >
          📄
        </span>

        <h3 className="document-viewer-filename">
          {originalName || selectedDocument}
        </h3>
      </div>

      {loading && (
        <p role="status">Loading document...</p>
      )}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && (
        <pre className="document-viewer-content">
          {documentContent}
        </pre>
      )}
    </section>
  );
}

export default DocumentViewer;
