// client/src/components/DocumentList.jsx
function DocumentList({ documents }) {
  if (documents.length === 0) {
    return <p>No documents available.</p>;
  }

  return (
    <section aria-labelledby="documents-heading">
      <h2 id="documents-heading">Available Documents</h2>

      <ul>
        {documents.map((document) => (
          <li key={document}>{document}</li>
        ))}
      </ul>
    </section>
  );
}

export default DocumentList;
