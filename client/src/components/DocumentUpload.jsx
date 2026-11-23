// client/src/components/DocumentUpload.jsx
import { useState } from "react";
import { uploadDocument } from "../services/documentService.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function DocumentUpload({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleFileChange(event) {
    const file = event.target.files[0];

    setError("");
    setSuccess("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Reject files larger than 10 MB before uploading
    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      event.target.value = "";

      setError("File exceeds the 10 MB upload limit.");
      return;
    }

    setSelectedFile(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please select a document.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const document = await uploadDocument(selectedFile);

      setSuccess(
        `${document.originalName} uploaded successfully.`
      );

      setSelectedFile(null);

      if (onUploadSuccess) {
        await onUploadSuccess(document);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section aria-labelledby="document-upload-heading">
      <h2 id="document-upload-heading">Upload Document</h2>

      <form onSubmit={handleSubmit}>
        <label htmlFor="document-file">
          Choose a PDF, TXT, or Markdown file
        </label>

        <input
          id="document-file"
          type="file"
          accept=".pdf,.txt,.md"
          onChange={handleFileChange}
          disabled={uploading}
        />

        <p>Maximum file size: 10 MB</p>

        <button
          type="submit"
          disabled={!selectedFile || uploading}
        >
          {uploading ? "Uploading..." : "Upload Document"}
        </button>
      </form>

      {error && (
        <p role="alert">{error}</p>
      )}

      {success && (
        <p role="status">{success}</p>
      )}
    </section>
  );
}
