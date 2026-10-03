from fastapi import APIRouter, Query, status
from app.schemas.item import ItemListResponse, ItemResponse
from app.db.repository import ItemRepository
from app.core.exceptions import NotFoundException
from app.core.logger import logger

router = APIRouter(prefix="/items", tags=["Items"])


@router.get("", response_model=ItemListResponse)
async def list_items(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """Retrieve all saved items ordered by newest first."""
    items, total = ItemRepository.get_items(limit=limit, offset=offset)
    return ItemListResponse(
        success=True,
        total=total,
        items=[ItemResponse(**it) for it in items],
    )


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(item_id: str):
    """Retrieve full details of a specific item, including raw and cleaned text."""
    item = ItemRepository.get_item(item_id)
    if not item:
        raise NotFoundException(f"Item with id '{item_id}' not found")
    return ItemResponse(**item)


@router.delete("/{item_id}")
async def delete_item(item_id: str):
    """Delete an item and cascade deletion to all its vector chunks."""
    logger.info(f"Deleting item: {item_id}")
    item = ItemRepository.get_item(item_id)
    if not item:
        raise NotFoundException(f"Item with id '{item_id}' not found")
    
    deleted = ItemRepository.delete_item(item_id)
    return {
        "success": deleted,
        "message": f"Item '{item['title']}' and its associated vector chunks were deleted successfully.",
    }


@router.post("/{item_id}/retry")
async def retry_item(item_id: str):
    """Retry processing a failed or pending item."""
    from fastapi import BackgroundTasks
    from app.api.ingest import process_ingest_background
    import asyncio

    item = ItemRepository.get_item(item_id)
    if not item:
        raise NotFoundException(f"Item with id '{item_id}' not found")

    logger.info(f"Retrying ingestion for item: {item_id} ({item['title']})")
    ItemRepository.update_item_status(item_id, status="pending", error_message="")

    # Fire background task
    asyncio.create_task(
        process_ingest_background(
            item_id=item["id"],
            item_type=item["type"],
            content=item.get("raw_content") or "",
            url=item.get("source_url") or "",
            title=item.get("title") or "",
        )
    )

    return {
        "success": True,
        "message": f"Retry queued for item '{item['title']}'.",
    }
