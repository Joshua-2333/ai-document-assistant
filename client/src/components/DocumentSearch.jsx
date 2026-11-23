// client/src/components/DocumentSearch.jsx
import { useRef, useState } from "react";
import { searchDocuments } from "../services/documentService";

function DocumentSearch({ documents, onSelectDocument }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Track the most recent search request
  const latestRequestId = useRef(0);

  async function handleSearch(event) {
    event.preventDefault();

    if (!query.trim()) {
      return;
    }

    const requestId = ++latestRequestId.current;

    setLoading(true);
    setError("");
    setResults([]);
    setHasSearched(false);

    try {
      const data = await searchDocuments(query.trim());

      // Ignore results from older searches
      if (requestId !== latestRequestId.current) {
        return;
      }

      setResults(data);
      setHasSearched(true);
    } catch (err) {
      if (requestId !== latestRequestId.current) {
        return;
      }

      setError(err.message);
    } finally {
      if (requestId === latestRequestId.current) {
        setLoading(false);
      }
    }
  }

  // Find the original filename using document metadata
  function getOriginalName(filename) {
    const document = documents.find(
      (item) => item.filename === filename
    );

    return document?.originalName ?? filename;
  }

  return (
    <section
      className="document-search-section"
      aria-labelledby="document-search-heading"
    >
      <h2 id="document-search-heading">Search Documents</h2>

      <form onSubmit={handleSearch}>
        <label htmlFor="document-search-input">
          Search for a word or phrase
        </label>

        <input
          id="document-search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. Python"
        />

        <button
          type="submit"
          disabled={loading || !query.trim()}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {loading && (
        <p role="status">Searching documents...</p>
      )}

      {error && <p role="alert">{error}</p>}

      {hasSearched && !loading && !error && (
        <div
          className="document-search-results"
          aria-live="polite"
        >
          <h3>Search Results</h3>

          {results.length === 0 ? (
            <p>No matching documents found.</p>
          ) : (
            <ul className="search-results-list">
              {results.map((result) => (
                <li
                  key={result.filename}
                  className="search-result-item"
                >
                  <h4 className="search-result-title">
                    <button
                      type="button"
                      className="search-result-button"
                      onClick={() =>
                        onSelectDocument(result.filename)
                      }
                    >
                      <span
                        className="search-result-icon"
                        aria-hidden="true"
                      >
                        📄
                      </span>

                      <span className="search-result-filename">
                        {getOriginalName(result.filename)}
                      </span>
                    </button>
                  </h4>

                  <p className="search-result-snippet">
                    {result.snippet}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export default DocumentSearch;
