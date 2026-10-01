from pathlib import Path
import re

import pymupdf
from docx import Document as DocxDocument


SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".txt",
    ".md",
}


def extract_text(file_path: str) -> str:
    """
    Extract readable text from supported document types.
    """

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Document not found: {file_path}"
        )

    extension = path.suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type: {extension}. "
            f"Supported types: PDF, DOCX, TXT, MD"
        )

    if extension == ".pdf":
        return _extract_pdf(path)

    if extension == ".docx":
        return _extract_docx(path)

    if extension in {".txt", ".md"}:
        return _extract_text_file(path)

    raise ValueError(
        f"Unsupported file type: {extension}"
    )


def _extract_pdf(path: Path) -> str:
    """
    Extract text from PDF page by page.
    """

    text_parts = []

    with pymupdf.open(path) as pdf:

        for page in pdf:

            page_text = page.get_text()

            if page_text.strip():
                text_parts.append(
                    page_text.strip()
                )

    text = "\n\n".join(text_parts)

    return _clean_extracted_text(text)


def _extract_docx(path: Path) -> str:
    """
    Extract paragraphs and table content from DOCX.
    """

    document = DocxDocument(path)

    text_parts = []

    # Extract normal paragraphs.
    for paragraph in document.paragraphs:

        text = paragraph.text.strip()

        if text:
            text_parts.append(text)

    # Extract tables.
    for table in document.tables:

        for row in table.rows:

            row_text = []

            for cell in row.cells:

                cell_text = cell.text.strip()

                if cell_text:
                    row_text.append(cell_text)

            if row_text:
                text_parts.append(
                    " | ".join(row_text)
                )

    text = "\n".join(text_parts)

    return _clean_extracted_text(text)


def _extract_text_file(path: Path) -> str:
    """
    Extract TXT or Markdown content.
    """

    text = path.read_text(
        encoding="utf-8",
        errors="replace",
    )

    return _clean_extracted_text(text)


def _clean_extracted_text(text: str) -> str:
    """
    Clean common formatting problems produced by
    PDF/DOCX/text extraction.

    The cleaning is intentionally conservative so that
    document meaning is not changed.
    """

    if not text:
        return ""

    # ---------------------------------------------------------
    # Normalize line endings.
    # ---------------------------------------------------------

    text = text.replace(
        "\r\n",
        "\n",
    )

    text = text.replace(
        "\r",
        "\n",
    )

    # ---------------------------------------------------------
    # Remove trailing spaces from every line.
    # ---------------------------------------------------------

    lines = [
        line.rstrip()
        for line in text.split("\n")
    ]

    text = "\n".join(lines)

    # ---------------------------------------------------------
    # Normalize tabs and repeated spaces.
    # ---------------------------------------------------------

    text = re.sub(
        r"[ \t]+",
        " ",
        text,
    )

    # ---------------------------------------------------------
    # Remove spaces immediately before punctuation.
    # ---------------------------------------------------------

    text = re.sub(
        r"\s+([,.;:!?])",
        r"\1",
        text,
    )

    # ---------------------------------------------------------
    # Restore common metadata line boundaries.
    #
    # Example:
    #
    # Effective Date: January 1, 2026 Version: 1.0
    #
    # becomes:
    #
    # Effective Date: January 1, 2026
    # Version: 1.0
    # ---------------------------------------------------------

    text = re.sub(
        r"(\bEffective Date:\s*[^:\n]+?)\s+(Version:)",
        r"\1\n\2",
        text,
        flags=re.IGNORECASE,
    )

    # ---------------------------------------------------------
    # Restore a new line before common metadata labels when
    # PDF extraction accidentally joins them.
    #
    # This is generic and not tied to one document.
    # ---------------------------------------------------------

    metadata_labels = (
        "Version",
        "Owner",
        "Department",
        "Author",
        "Created By",
        "Approved By",
        "Effective Date",
        "Review Date",
        "Document ID",
        "Status",
    )

    for label in metadata_labels:

        text = re.sub(
            rf"(?<!\n)\s+({re.escape(label)}:)",
            rf"\n\1",
            text,
            flags=re.IGNORECASE,
        )

    # ---------------------------------------------------------
    # Restore boundaries between numbered sections if PDF
    # extraction puts them on the same line.
    #
    # Example:
    #
    # text 2. SCOPE
    #
    # becomes:
    #
    # text
    # 2. SCOPE
    # ---------------------------------------------------------

    text = re.sub(
        r"\s+(?=\d+\.\s+[A-Z][A-Za-z &/&()'-]{2,80}(?=\s|$))",
        "\n",
        text,
    )

    # ---------------------------------------------------------
    # Restore subsection boundaries.
    #
    # Example:
    #
    # 3.1 Annual Leave 3.2 Sick Leave
    #
    # becomes:
    #
    # 3.1 Annual Leave
    # 3.2 Sick Leave
    # ---------------------------------------------------------

    text = re.sub(
        r"\s+(?=\d+\.\d+(?:\.\d+)*\s+[A-Z])",
        "\n",
        text,
    )

    # ---------------------------------------------------------
    # Restore common sentence/statement boundaries where PDF
    # extraction has clearly joined independent statements.
    #
    # We intentionally keep this conservative.
    # ---------------------------------------------------------

    text = re.sub(
        r"(?<=[a-z])\s+(?=[A-Z][a-z]+(?:\s+[a-z]+){0,8}\s+(?:are|is|cannot|can|must|may|will|shall)\b)",
        "\n",
        text,
    )

    # ---------------------------------------------------------
    # Remove excessive blank lines.
    # ---------------------------------------------------------

    text = re.sub(
        r"\n{3,}",
        "\n\n",
        text,
    )

    return text.strip()