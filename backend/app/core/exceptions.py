from fastapi import HTTPException, status


class KnowledgeInboxException(HTTPException):
    def __init__(self, status_code: int, detail: str, error_code: str = "ERROR"):
        super().__init__(status_code=status_code, detail={"error": detail, "code": error_code})


class NotFoundException(KnowledgeInboxException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail, error_code="NOT_FOUND")


class IngestionException(KnowledgeInboxException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail, error_code="INGESTION_FAILED")


class ScraperException(KnowledgeInboxException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail, error_code="SCRAPER_FAILED")


class RAGException(KnowledgeInboxException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail, error_code="RAG_FAILED")
