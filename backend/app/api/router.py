from fastapi import APIRouter
from app.api.ingest import router as ingest_router
from app.api.items import router as items_router
from app.api.query import router as query_router

api_router = APIRouter(prefix="/api")
api_router.include_router(ingest_router)
api_router.include_router(items_router)
api_router.include_router(query_router)
