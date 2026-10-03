from fastapi import APIRouter, BackgroundTasks, status
from app.schemas.ingest import IngestRequest, IngestResponse
from app.schemas.item import ItemResponse
from app.db.repository import ItemRepository
from app.services.scraper import fetch_and_clean_url
from app.services.chunker import chunk_text
from app.services.ai_service import AIService
from app.core.logger import logger
from app.core.exceptions import IngestionException

router = APIRouter(prefix="/ingest", tags=["Ingest"])


async def process_ingest_background(item_id: str, item_type: str, content: str = "", url: str = "", title: str = ""):
    """Async background worker for content extraction, chunking, and embedding."""
    logger.info(f"Background worker started for item {item_id} (type={item_type})")
    try:
        ItemRepository.update_item_status(item_id, status="processing")

        if item_type == "url":
            extracted_title, cleaned_text, raw_html = await fetch_and_clean_url(url)
            final_title = title.strip() if title and title.strip() else extracted_title
            chunks = chunk_text(cleaned_text)
            
            # Save cleaned content and final title
            ItemRepository.update_item_status(
                item_id,
                status="processing",
                title=final_title,
                cleaned_content=cleaned_text,
            )
        else: # note
            cleaned_text = content.strip()
            final_title = title.strip() if title and title.strip() else (cleaned_text.splitlines()[0][:60] if cleaned_text else "Untitled Note")
            chunks = chunk_text(cleaned_text)
            ItemRepository.update_item_status(
                item_id,
                status="processing",
                title=final_title,
                cleaned_content=cleaned_text,
            )

        if not chunks:
            chunks = [cleaned_text]

        # Generate embeddings for each chunk
        chunks_payload = []
        for idx, chk in enumerate(chunks):
            emb = await AIService.get_embedding(chk)
            chunks_payload.append({
                "item_id": item_id,
                "chunk_index": idx,
                "content": chk,
                "embedding": emb,
            })

        # Persist chunks into vector store
        ItemRepository.save_chunks(chunks_payload)

        # Mark item as ready
        ItemRepository.update_item_status(
            item_id,
            status="ready",
            chunk_count=len(chunks_payload),
        )
        logger.info(f"Item {item_id} processed successfully with {len(chunks_payload)} chunks.")

    except Exception as e:
        logger.error(f"Failed processing item {item_id}: {e}", exc_info=True)
        ItemRepository.update_item_status(
            item_id,
            status="failed",
            error_message=str(e),
        )


@router.post("", response_model=IngestResponse, status_code=status.HTTP_202_ACCEPTED)
async def ingest_content(payload: IngestRequest, background_tasks: BackgroundTasks):
    """
    Ingest a new text note or remote URL.
    Returns 202 Accepted immediately, scheduling background scraping and indexing.
    """
    logger.info(f"Received ingest request: type={payload.type}")
    
    if payload.type == "note":
        raw_content = payload.content or ""
        title = payload.title or (raw_content.splitlines()[0][:50] if raw_content else "Untitled Note")
        item = ItemRepository.create_item(
            item_type="note",
            title=title,
            raw_content=raw_content,
            source_url=None,
            status="pending",
        )
        background_tasks.add_task(
            process_ingest_background,
            item_id=item["id"],
            item_type="note",
            content=raw_content,
            title=payload.title or "",
        )
    elif payload.type == "url":
        url = payload.url or ""
        title = payload.title or url
        item = ItemRepository.create_item(
            item_type="url",
            title=title,
            raw_content="",
            source_url=url,
            status="pending",
        )
        background_tasks.add_task(
            process_ingest_background,
            item_id=item["id"],
            item_type="url",
            url=url,
            title=payload.title or "",
        )
    else:
        raise IngestionException("Unsupported content type")

    return IngestResponse(
        success=True,
        data=ItemResponse(**item),
        message="Item queued for asynchronous processing and indexing.",
    )
