from typing import Dict, Any, List
from app.services.ai_service import AIService
from app.db.repository import ItemRepository
from app.config import settings
from app.core.logger import logger

GREETINGS = {"hi", "hello", "hey", "hola", "greetings", "test"}


async def execute_rag_pipeline(query: str, top_k: int = 4) -> Dict[str, Any]:
    cleaned_query = query.strip()
    logger.info(f"Executing RAG pipeline for query: '{cleaned_query}' (top_k={top_k})")

    # Conversational greeting check: do not hallucinate random notes on simple greetings
    if cleaned_query.lower() in GREETINGS:
        return {
            "query": query,
            "answer": (
                "Hello! I am your AI Knowledge Assistant. Ask me anything about your saved notes and articles "
                "(for example: *\"What are the tradeoffs of SQLite WAL mode?\"* or *\"How does chunking work in RAG?\"*)."
            ),
            "citations": [],
            "model": settings.LLM_MODEL if not settings.is_mock_mode else "local-mock",
            "is_mock": settings.is_mock_mode,
        }

    # 1. Embed query
    query_vector = await AIService.get_embedding(cleaned_query)

    # 2. Retrieve top-k chunks
    retrieved_chunks = ItemRepository.search_top_k_chunks(query_vector, top_k=top_k * 2)

    if not retrieved_chunks:
        return {
            "query": query,
            "answer": "Your knowledge inbox is currently empty. Please save a note or web article URL first!",
            "citations": [],
            "model": settings.LLM_MODEL if not settings.is_mock_mode else "local-mock",
            "is_mock": settings.is_mock_mode,
        }

    # Deduplicate chunks by chunk_text / item_id to avoid redundant citations
    seen_texts = set()
    unique_chunks = []
    for chunk in retrieved_chunks:
        snippet_key = chunk["chunk_text"].strip()[:80]
        if snippet_key not in seen_texts:
            seen_texts.add(snippet_key)
            unique_chunks.append(chunk)
        if len(unique_chunks) >= top_k:
            break

    # 3. Format context blocks for LLM
    context_blocks: List[str] = []
    citations: List[Dict[str, Any]] = []

    for idx, chunk in enumerate(unique_chunks, 1):
        context_blocks.append(
            f"[Source {idx}]: {chunk['title']}\n{chunk['chunk_text']}"
        )
        citations.append({
            "citation_id": idx,
            "item_id": chunk["item_id"],
            "title": chunk["title"],
            "source_type": chunk["source_type"],
            "source_url": chunk["source_url"],
            "chunk_index": chunk["chunk_index"],
            "chunk_text": chunk["chunk_text"],
            "similarity_score": chunk["similarity_score"],
        })

    # 4. Generate grounded synthesis
    answer, used_model = await AIService.generate_rag_answer(cleaned_query, context_blocks)

    return {
        "query": query,
        "answer": answer,
        "citations": citations,
        "model": used_model,
        "is_mock": settings.is_mock_mode,
    }
