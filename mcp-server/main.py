"""mcp-server/main.py"""

from pathlib import Path

from fastmcp import FastMCP
from pypdf import PdfReader
from pypdf.errors import PdfReadError


# Create the MCP server
mcp = FastMCP("AI Document Assistant")

# Directory containing uploaded documents
DOCUMENTS_DIR = Path(__file__).resolve().parent / "documents"

# Supported document formats
SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf"}


@mcp.tool
def list_documents() -> list[str]:
    """List supported documents available in the document storage directory."""

    documents = []

    for file_path in DOCUMENTS_DIR.iterdir():
        if (
            file_path.is_file()
            and not file_path.is_symlink()
            and file_path.suffix.lower() in SUPPORTED_EXTENSIONS
        ):
            documents.append(file_path.name)

    return sorted(documents)


@mcp.tool
def read_document(filename: str) -> str:
    """Read the contents of a text, Markdown, or PDF document."""

    file_path = DOCUMENTS_DIR / filename

    # Prevent access outside document storage
    if file_path.resolve().parent != DOCUMENTS_DIR.resolve():
        return "Error: Access denied."

    # Check supported file formats
    if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        return "Error: Unsupported file format."

    # Verify the document exists
    if not file_path.is_file():
        return "Error: Document not found."

    try:
        # Read PDF documents
        if file_path.suffix.lower() == ".pdf":
            reader = PdfReader(file_path)

            pages = []

            for page in reader.pages:
                text = page.extract_text() or ""
                pages.append(text)

            return "\n\n".join(pages)

        # Read text and Markdown documents
        return file_path.read_text(encoding="utf-8")

    except (OSError, UnicodeError, ValueError, PdfReadError) as error:
        return f"Error: Unable to read document. {error}"


@mcp.tool
def search_documents(query: str) -> list[dict]:
    """Search supported documents for a word or phrase."""

    if not query.strip():
        return []

    results = []

    for filename in list_documents():
        content = read_document(filename)

        # Skip documents that could not be read
        if content.startswith("Error:"):
            continue

        # Search without case sensitivity
        if query.casefold() in content.casefold():
            results.append({
                "filename": filename,
                "snippet": content[:300],
            })

    return results


if __name__ == "__main__":
    mcp.run()
