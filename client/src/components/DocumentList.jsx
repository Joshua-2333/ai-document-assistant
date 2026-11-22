// client/src/components/DocumentList.jsx

function DocumentList({
  documents,
  selectedDocument,
  onSelectDocument,
}) {
  return (
    <section
      className="document-list-section"
      aria-labelledby="documents-heading"
    >
      <h2 id="documents-heading">Available Documents</h2>

      {documents.length === 0 ? (
        <p>No documents available.</p>
      ) : (
        <ul className="document-list">
          {documents.map((document) => {
            const isSelected =
              selectedDocument === document.filename;

            return (
              <li
                key={document.filename}
                className="document-list-item"
              >
                <button
                  type="button"
                  className={`document-list-button ${
                    isSelected ? "document-list-button-selected" : ""
                  }`}
                  onClick={() =>
                    onSelectDocument(document.filename)
                  }
                  aria-pressed={isSelected}
                >
                  <span
                    className="document-file-icon"
                    aria-hidden="true"
                  >
                    📄
                  </span>

                  <span className="document-file-name">
                    {document.originalName}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default DocumentList;
