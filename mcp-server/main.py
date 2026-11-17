"""mcp-server/main.py"""

from pathlib import Path

from fastmcp import FastMCP

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
    """Read the contents of a text or Markdown document."""

    file_path = DOCUMENTS_DIR / filename

    # Prevent directory traversal and access outside document storage
    if file_path.resolve().parent != DOCUMENTS_DIR.resolve():
        return "Error: Access denied."

    # Only allow text and Markdown files
    if file_path.suffix.lower() not in {".txt", ".md"}:
        return "Error: Unsupported file format."

    # Verify that the document exists
    if not file_path.is_file():
        return "Error: Document not found."

    # Read the document
    try:
        return file_path.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        return "Error: Unable to read document."


if __name__ == "__main__":
    mcp.run()
