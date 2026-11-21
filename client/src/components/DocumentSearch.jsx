// client/src/components/DocumentSearch.jsx
import { useState } from "react";
import { searchDocuments } from "../services/documentService";

function DocumentSearch({ onSelectDocument }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(event) {
    event.preventDefault();

    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setHasSearched(false);

    try {
      const data = await searchDocuments(query.trim());
      setResults(data);
      setHasSearched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="document-search-heading">
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

        <button type="submit" disabled={loading || !query.trim()}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {loading && <p role="status">Searching documents...</p>}

      {error && <p role="alert">{error}</p>}

      {hasSearched && !loading && !error && (
        <div aria-live="polite">
          <h3>Search Results</h3>

          {results.length === 0 ? (
            <p>No matching documents found.</p>
          ) : (
            <ul>
              {results.map((result) => (
                <li key={result.filename}>
                  <h4>
                    <button
                      type="button"
                      onClick={() => onSelectDocument(result.filename)}
                    >
                      {result.filename}
                    </button>
                  </h4>

                  <p style={{ whiteSpace: "pre-wrap" }}>
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
