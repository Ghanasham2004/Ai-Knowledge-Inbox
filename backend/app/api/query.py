from fastapi import APIRouter
from app.schemas.query import QueryRequest, QueryResponse
from app.services.rag import execute_rag_pipeline
from app.core.logger import logger

router = APIRouter(prefix="/query", tags=["Query"])


@router.post("", response_model=QueryResponse)
async def query_knowledge_inbox(payload: QueryRequest):
    """
    Query the knowledge inbox using semantic retrieval and grounded AI generation.
    Returns synthesized answer and cited sources.
    """
    logger.info(f"Querying knowledge inbox with: '{payload.query}' (top_k={payload.top_k})")
    result = await execute_rag_pipeline(query=payload.query, top_k=payload.top_k)
    return QueryResponse(**result)
