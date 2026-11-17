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


if __name__ == "__main__":
    mcp.run()
