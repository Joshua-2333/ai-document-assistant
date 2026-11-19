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
            <li key={document}>
              <button
                type="button"
                onClick={() => onSelectDocument(document)}
                aria-pressed={selectedDocument === document}
              >
                {document}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default DocumentList;
