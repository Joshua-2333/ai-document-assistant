// client/src/components/DocumentList.jsx
function DocumentList({ documents, selectedDocument, onSelectDocument }) {
  return (
    <section aria-labelledby="documents-heading">
      <h2 id="documents-heading">Available Documents</h2>

      {documents.length === 0 ? (
        <p>No documents available.</p>
      ) : (
        <ul>
          {documents.map((document) => (
            <li key={document.filename}>
              <button
                type="button"
                onClick={() => onSelectDocument(document.filename)}
                aria-pressed={selectedDocument === document.filename}
              >
                {document.originalName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default DocumentList;
