// client/src/App.jsx
import { useEffect, useState } from "react";
import DocumentList from "./components/DocumentList";
import { fetchDocuments } from "./services/documentService";
import "./App.css";

function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <main>
      <h1>AI Document Assistant</h1>

      {loading && <p>Loading documents...</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && (
        <DocumentList documents={documents} />
      )}
    </main>
  );
}

export default App;
