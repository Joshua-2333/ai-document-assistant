"""mcp-server/main.py"""
import re
from pathlib import Path

from fastmcp import FastMCP
from pypdf import PdfReader
from pypdf.errors import PdfReadError


# Create the MCP server
mcp = FastMCP("AI Document Assistant")

# Document storage directories
BASE_DIR = Path(__file__).resolve().parent
DOCUMENTS_DIR = BASE_DIR / "documents"
SAMPLE_DOCUMENTS_DIR = BASE_DIR / "sample-documents"

# Public sample documents
SAMPLE_DOCUMENTS = {
    "company-handbook.pdf",
    "product-inventory.txt",
    "software-documentation.md",
}

# Supported document formats
SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf"}

# Document processing limits
MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_PDF_PAGES = 100
MAX_DOCUMENT_CHARACTERS = 100_000
MAX_SEARCH_DOCUMENTS = 8
MAX_SEARCH_QUERY_LENGTH = 1000

# Validate UUID-based stored filenames
FILENAME_PATTERN = re.compile(
    r"[a-f0-9]{8}-"
    r"[a-f0-9]{4}-"
    r"[a-f0-9]{4}-"
    r"[a-f0-9]{4}-"
    r"[a-f0-9]{12}\.(pdf|txt|md)"
)


def is_valid_filename(filename: str) -> bool:
    """Validate a public sample or private document filename."""

    return (
        isinstance(filename, str)
        and (
            filename in SAMPLE_DOCUMENTS
            or FILENAME_PATTERN.fullmatch(filename) is not None
        )
    )


def read_document_content(filename: str) -> str:
    """Safely read a public sample or authorized private document."""

    # Reject invalid filenames
    if not is_valid_filename(filename):
        return "Error: Access denied."

    # Select the appropriate document directory
    if filename in SAMPLE_DOCUMENTS:
        document_directory = SAMPLE_DOCUMENTS_DIR
    else:
        document_directory = DOCUMENTS_DIR

    file_path = document_directory / filename

    try:
        # Prevent symbolic link access
        if file_path.is_symlink():
            return "Error: Access denied."

        # Prevent access outside the selected directory
        if file_path.resolve().parent != document_directory.resolve():
            return "Error: Access denied."

        # Check supported file formats
        if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            return "Error: Unsupported file format."

        # Verify the document exists
        if not file_path.is_file():
            return "Error: Document not found."

        # Enforce the maximum file size
        if file_path.stat().st_size > MAX_FILE_SIZE:
            return "Error: Document exceeds the file size limit."

        # Read PDF documents
        if file_path.suffix.lower() == ".pdf":
            reader = PdfReader(file_path)

            # Reject encrypted PDFs
            if reader.is_encrypted:
                return "Error: Encrypted PDFs are not supported."

            # Enforce the maximum PDF page count
            if len(reader.pages) > MAX_PDF_PAGES:
                return "Error: PDF exceeds the page limit."

            pages = []
            total_characters = 0

            for page in reader.pages:
                text = page.extract_text() or ""

                total_characters += len(text)

                if pages:
                    total_characters += 2

                # Prevent excessively large extracted documents
                if total_characters > MAX_DOCUMENT_CHARACTERS:
                    return "Error: Document exceeds the text limit."

                pages.append(text)

            return "\n\n".join(pages)

        # Read text and Markdown documents
        with file_path.open("r", encoding="utf-8") as document:
            content = document.read(MAX_DOCUMENT_CHARACTERS + 1)

        if len(content) > MAX_DOCUMENT_CHARACTERS:
            return "Error: Document exceeds the text limit."

        return content

    except FileNotFoundError:
        return "Error: Document not found."

    except (OSError, UnicodeError, ValueError, PdfReadError):
        # Do not expose internal filesystem or parsing details
        return "Error: Unable to read document."


@mcp.tool
def read_document(filename: str) -> str:
    """Read a document authorized by the Express backend."""

    return read_document_content(filename)


@mcp.tool
def search_documents(
    query: str,
    filenames: list[str],
) -> list[dict]:
    """Search only documents authorized by the Express backend."""

    query = query.strip()

    # Validate the search query
    if not query or len(query) > MAX_SEARCH_QUERY_LENGTH:
        return []

    # Enforce the maximum number of searchable documents
    if len(filenames) > MAX_SEARCH_DOCUMENTS:
        return []

    # Reject invalid filenames
    if not all(is_valid_filename(name) for name in filenames):
        return []

    # Remove duplicate filenames
    authorized_filenames = list(dict.fromkeys(filenames))

    results = []

    # Search only the explicitly authorized documents
    for filename in authorized_filenames:
        content = read_document_content(filename)

        # Skip documents that could not be read
        if content.startswith("Error:"):
            continue

        # Find the first match without case sensitivity
        match = re.search(
            re.escape(query),
            content,
            flags=re.IGNORECASE,
        )

        if match is None:
            continue

        # Extract up to 100 characters before and after the match
        start = max(0, match.start() - 100)
        end = min(len(content), match.end() + 100)

        snippet = content[start:end].strip()

        results.append({
            "filename": filename,
            "snippet": snippet,
        })

    return results


if __name__ == "__main__":
    mcp.run(transport="stdio")