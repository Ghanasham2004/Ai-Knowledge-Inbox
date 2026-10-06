import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.core.logger import logger
from app.core.exceptions import KnowledgeInboxException
from app.db.database import init_db
from app.db.repository import ItemRepository
from app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AI Knowledge Inbox API...")
    init_db()
    logger.info(f"Mock Mode: {settings.is_mock_mode} (Gemini API Key configured: {bool(settings.GEMINI_API_KEY)})")

    # Auto-seed if database is empty (e.g. on fresh Render/Cloud deployment or first run)
    try:
        items, total_count = ItemRepository.get_items(limit=1, offset=0)
        if total_count == 0:
            logger.info("Database is empty. Automatically seeding sample technical notes...")
            from seed import seed_data
            await seed_data()
            logger.info("Auto-seeding completed successfully!")
    except Exception as e:
        logger.warning(f"Auto-seed check encountered non-fatal error: {e}")

    yield
    logger.info("Shutting down AI Knowledge Inbox API...")


app = FastAPI(
    title="AI Knowledge Inbox API",
    description="Minimal production-style AI Knowledge Inbox with asynchronous ingestion and RAG.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permissive for local development & Docker bridge
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging & timing middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    logger.info(f"{request.method} {request.url.path} - {response.status_code} ({duration_ms}ms)")
    return response


# Global Exception Handler
@app.exception_handler(KnowledgeInboxException)
async def custom_exception_handler(request: Request, exc: KnowledgeInboxException):
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail,
    )


@app.get("/api/health", tags=["Health"])
async def health_check():
    items, total = ItemRepository.get_items(limit=1)
    return {
        "status": "healthy",
        "service": "AI Knowledge Inbox",
        "mock_mode": settings.is_mock_mode,
        "llm_model": settings.LLM_MODEL if not settings.is_mock_mode else "local-mock",
        "total_items": total,
    }


# Include unified API router
app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
