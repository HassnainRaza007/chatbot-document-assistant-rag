import re


MAX_CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150


def chunk_document(
    text: str,
    max_chunk_size: int = MAX_CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> list[str]:
    """
    Adaptive document chunker for RAG.

    Strategy:
    1. Normalize extracted document text.
    2. Restore numbered section boundaries where possible.
    3. Detect real section headings.
    4. Keep each section together.
    5. Preserve table-like/structured content inside its section.
    6. Split only when a section becomes too large.
    7. Preserve sentence/word boundaries when splitting is required.
    """

    if not text or not text.strip():
        return []

    text = _normalize_text(text)

    text = _normalize_numbered_headings(text)

    lines = text.splitlines()

    sections = _build_sections(lines)

    if not sections:
        return _fallback_chunk_text(
            text,
            max_chunk_size,
            overlap,
        )

    chunks = []

    for section in sections:

        if len(section) <= max_chunk_size:
            chunks.append(section)
            continue

        chunks.extend(
            _split_large_section(
                section,
                max_chunk_size,
                overlap,
            )
        )

    return [
        chunk.strip()
        for chunk in chunks
        if chunk.strip()
    ]


def _normalize_text(text: str) -> str:
    """
    Normalize extracted text while preserving meaningful
    line boundaries.
    """

    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    text = re.sub(
        r"[ \t]+",
        " ",
        text,
    )

    text = re.sub(
        r"\n{3,}",
        "\n\n",
        text,
    )

    return text.strip()


def _normalize_numbered_headings(text: str) -> str:
    """
    Restore numbered section boundaries when PDF extraction
    places them on the same line as previous content.
    """

    # Subsections such as:
    # 3.1 Annual Leave
    # 3.2 Sick Leave
    text = re.sub(
        r"\s+(?=\d+\.\d+(?:\.\d+)*\s+[A-Z])",
        "\n",
        text,
    )

    # Main sections such as:
    # 4. APPROVAL PROCESS
    # 5. BOOKING TRAVEL
    text = re.sub(
        r"\s+(?=\d+\.\s+[A-Z][A-Za-z &/&()'-]{2,80}(?=\n|$))",
        "\n",
        text,
    )

    return text


def _build_sections(lines: list[str]) -> list[str]:
    """
    Build logical document sections.

    Only real document headings start a new section.

    Short lines such as:

        Travel Type
        Approver
        Domestic (under $1,000)
        Direct Manager
        International
        Department Head + Finance

    are treated as section content rather than headings.

    This preserves table-like structures.
    """

    sections = []
    current = []

    for raw_line in lines:

        line = raw_line.strip()

        if not line:
            continue

        if _is_section_heading(line):

            if current:
                sections.append(
                    "\n".join(current).strip()
                )

            current = [line]

        else:
            current.append(line)

    if current:
        sections.append(
            "\n".join(current).strip()
        )

    return sections


def _is_section_heading(line: str) -> bool:
    """
    Detect actual document section headings.

    Generic title-case lines are intentionally NOT treated
    as headings because PDFs often extract table cells as
    individual lines.
    """

    if not line:
        return False

    # Bullet/list items are never headings.
    if re.match(
        r"^[-*•●]\s+",
        line,
    ):
        return False

    # Numbered headings are the strongest signal.
    numbered_match = re.match(
        r"^(\d+(?:\.\d+)*)\.\s+(.+)$",
        line,
    )

    if numbered_match:

        title = numbered_match.group(2).strip()

        if len(title) > 100:
            return False

        if not re.match(
            r"^[A-Z]",
            title,
        ):
            return False

        if title.endswith(
            (".", "?", "!", ";", ":")
        ):
            return False

        # Numbered instructions should remain content.
        if re.search(
            r"\b("
            r"submit|notify|send|complete|enter|select|click|"
            r"contact|provide|ensure|attach|upload|approve|"
            r"must|should|required"
            r")\b",
            title,
            flags=re.IGNORECASE,
        ):
            return False

        return True

    # ALL CAPS headings are usually genuine section headings.
    if _is_mostly_uppercase(line):
        return True

    # Do NOT use broad title-case detection.
    #
    # Short values such as:
    #   Travel Type
    #   Approver
    #   International
    #   Travel
    #   $[X]
    #
    # are common table cells and must stay inside the
    # surrounding section.

    return False


def _is_mostly_uppercase(line: str) -> bool:
    """
    Detect genuine uppercase headings.

    Requires at least two alphabetic characters so that
    values such as '$[X]' are not incorrectly treated
    as headings.
    """

    letters = [
        char
        for char in line
        if char.isalpha()
    ]

    if not letters:
        return False

    # Prevent values such as:
    # $[X]
    # [X]
    # 123
    # from being treated as headings.
    if len(letters) < 2:
        return False

    uppercase_count = sum(
        1
        for char in letters
        if char.isupper()
    )

    return (
        uppercase_count / len(letters) >= 0.80
        and len(line.split()) <= 12
    )


def _split_large_section(
    section: str,
    max_chunk_size: int,
    overlap: int,
) -> list[str]:
    """
    Split a large section while keeping the section heading
    attached to the first chunk.
    """

    lines = section.splitlines()

    if (
        len(lines) > 1
        and _is_section_heading(lines[0])
    ):

        heading = lines[0]

        body = "\n".join(
            lines[1:]
        ).strip()

        available_size = (
            max_chunk_size
            - len(heading)
            - 1
        )

        body_chunks = _split_structured_content(
            body,
            max(available_size, 200),
            overlap,
        )

        if not body_chunks:
            return [heading]

        chunks = []

        for index, body_chunk in enumerate(
            body_chunks
        ):

            if index == 0:

                chunks.append(
                    f"{heading}\n{body_chunk}".strip()
                )

            else:

                chunks.append(
                    body_chunk.strip()
                )

        return chunks

    return _split_structured_content(
        section,
        max_chunk_size,
        overlap,
    )


def _split_structured_content(
    text: str,
    max_chunk_size: int,
    overlap: int,
) -> list[str]:
    """
    Split structured content conservatively.

    First preserve line/paragraph groups.
    Then fall back to sentence splitting only when
    necessary.
    """

    if not text:
        return []

    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    chunks = []
    current_lines = []
    current_length = 0

    for line in lines:

        line_length = len(line)

        separator_length = (
            1
            if current_lines
            else 0
        )

        candidate_length = (
            current_length
            + separator_length
            + line_length
        )

        if (
            current_lines
            and candidate_length > max_chunk_size
        ):

            current_text = "\n".join(
                current_lines
            ).strip()

            chunks.append(
                current_text
            )

            overlap_text = _get_line_overlap(
                current_lines,
                overlap,
            )

            current_lines = (
                overlap_text
                if overlap_text
                else []
            )

            current_length = len(
                "\n".join(current_lines)
            )

        # A single line may itself be too large.
        if (
            not current_lines
            and line_length > max_chunk_size
        ):

            chunks.extend(
                _split_text(
                    line,
                    max_chunk_size,
                    overlap,
                )
            )

            current_lines = []
            current_length = 0

            continue

        current_lines.append(line)

        current_length = len(
            "\n".join(current_lines)
        )

    if current_lines:

        chunks.append(
            "\n".join(
                current_lines
            ).strip()
        )

    return chunks


def _get_line_overlap(
    lines: list[str],
    overlap: int,
) -> list[str]:
    """
    Preserve the last few lines of the previous chunk
    as overlap.

    This is preferable for structured documents because
    line boundaries carry useful meaning.
    """

    if not lines or overlap <= 0:
        return []

    selected = []
    total_length = 0

    for line in reversed(lines):

        additional_length = (
            len(line)
            + (1 if selected else 0)
        )

        if (
            total_length
            + additional_length
            > overlap
        ):
            break

        selected.insert(
            0,
            line,
        )

        total_length += additional_length

    return selected


def _split_text(
    text: str,
    max_chunk_size: int,
    overlap: int,
) -> list[str]:
    """
    Generic fallback text splitter.
    """

    if not text:
        return []

    paragraphs = re.split(
        r"\n\s*\n",
        text,
    )

    chunks = []

    for paragraph in paragraphs:

        paragraph = paragraph.strip()

        if not paragraph:
            continue

        if len(paragraph) <= max_chunk_size:

            chunks.append(
                paragraph
            )

            continue

        chunks.extend(
            _split_by_sentences(
                paragraph,
                max_chunk_size,
                overlap,
            )
        )

    return chunks


def _split_by_sentences(
    text: str,
    max_chunk_size: int,
    overlap: int,
) -> list[str]:
    sentences = re.split(
        r"(?<=[.!?])\s+",
        text,
    )

    chunks = []
    current = ""

    for sentence in sentences:

        sentence = sentence.strip()

        if not sentence:
            continue

        if len(sentence) > max_chunk_size:

            if current:

                chunks.append(
                    current.strip()
                )

                current = ""

            chunks.extend(
                _split_long_text(
                    sentence,
                    max_chunk_size,
                    overlap,
                )
            )

            continue

        candidate = (
            sentence
            if not current
            else f"{current} {sentence}"
        )

        if len(candidate) <= max_chunk_size:

            current = candidate

        else:

            chunks.append(
                current.strip()
            )

            overlap_text = _get_word_overlap(
                current,
                overlap,
            )

            current = (
                f"{overlap_text} {sentence}".strip()
                if overlap_text
                else sentence
            )

    if current:

        chunks.append(
            current.strip()
        )

    return chunks


def _split_long_text(
    text: str,
    max_chunk_size: int,
    overlap: int,
) -> list[str]:

    words = text.split()

    chunks = []
    current_words = []

    for word in words:

        candidate_words = (
            current_words
            + [word]
        )

        candidate = " ".join(
            candidate_words
        )

        if len(candidate) <= max_chunk_size:

            current_words = candidate_words

            continue

        if current_words:

            chunk = " ".join(
                current_words
            )

            chunks.append(
                chunk
            )

            overlap_text = _get_word_overlap(
                chunk,
                overlap,
            )

            current_words = (
                overlap_text.split()
                if overlap_text
                else []
            )

        current_words.append(
            word
        )

    if current_words:

        chunks.append(
            " ".join(
                current_words
            )
        )

    return chunks


def _get_word_overlap(
    text: str,
    overlap: int,
) -> str:

    if not text:
        return ""

    if len(text) <= overlap:
        return text

    overlap_text = text[-overlap:]

    first_space = overlap_text.find(" ")

    if first_space == -1:
        return ""

    return overlap_text[
        first_space + 1:
    ]


def _fallback_chunk_text(
    text: str,
    max_chunk_size: int,
    overlap: int,
) -> list[str]:

    return _split_text(
        text,
        max_chunk_size,
        overlap,
    )