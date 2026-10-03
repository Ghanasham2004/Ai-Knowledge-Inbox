from typing import List


class RecursiveCharacterChunker:
    def __init__(
        self,
        chunk_size: int = 600,
        chunk_overlap: int = 100,
        separators: List[str] = None,
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", " ", ""]

    def split_text(self, text: str) -> List[str]:
        if not text or not text.strip():
            return []
        return self._split(text.strip(), self.separators)

    def _split(self, text: str, separators: List[str]) -> List[str]:
        final_chunks: List[str] = []
        separator = separators[-1]
        new_separators = []

        for i, sep in enumerate(separators):
            if sep == "":
                separator = ""
                break
            if sep in text:
                separator = sep
                new_separators = separators[i + 1:]
                break

        splits = text.split(separator) if separator != "" else list(text)

        current_doc: List[str] = []
        total_len = 0

        for piece in splits:
            if not piece:
                continue

            piece_len = len(piece) + (len(separator) if current_doc else 0)

            if total_len + piece_len > self.chunk_size:
                if total_len > 0:
                    joined = separator.join(current_doc)
                    if joined.strip():
                        final_chunks.append(joined.strip())

                    # Apply overlap: keep pieces from the tail of current_doc
                    while total_len > self.chunk_overlap and current_doc:
                        removed = current_doc.pop(0)
                        total_len -= len(removed) + len(separator)

                if len(piece) > self.chunk_size and new_separators:
                    sub_chunks = self._split(piece, new_separators)
                    final_chunks.extend(sub_chunks)
                    current_doc = []
                    total_len = 0
                else:
                    current_doc.append(piece)
                    total_len = len(piece)
            else:
                current_doc.append(piece)
                total_len += piece_len

        if current_doc:
            joined = separator.join(current_doc)
            if joined.strip():
                final_chunks.append(joined.strip())

        return final_chunks


default_chunker = RecursiveCharacterChunker(chunk_size=600, chunk_overlap=100)


def chunk_text(text: str, chunk_size: int = 600, chunk_overlap: int = 100) -> List[str]:
    chunker = RecursiveCharacterChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    return chunker.split_text(text)
