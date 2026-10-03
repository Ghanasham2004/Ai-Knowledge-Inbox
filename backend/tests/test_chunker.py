from app.services.chunker import chunk_text, RecursiveCharacterChunker


def test_empty_text():
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_short_text():
    text = "Short note that does not exceed chunk size."
    chunks = chunk_text(text, chunk_size=600, chunk_overlap=100)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunk_splitting_and_overlap():
    paragraph = "This is a detailed sentence testing the chunking system. " * 20
    chunks = chunk_text(paragraph, chunk_size=300, chunk_overlap=50)
    assert len(chunks) > 1
    for chk in chunks:
        assert len(chk) <= 350 # within bounds
        assert len(chk) > 0
