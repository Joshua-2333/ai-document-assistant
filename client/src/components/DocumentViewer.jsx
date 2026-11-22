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
    <section aria-labelledby="selected-document-heading">
      <h2 id="selected-document-heading">
        Selected Document
      </h2>

      <h3>{originalName || selectedDocument}</h3>

      {loading && <p role="status">Loading document...</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {documentContent}
        </pre>
      )}
    </section>
  );
}

export default DocumentViewer;
