# Product Requirement Document (PRD)
## Minimal "AI Knowledge Inbox"

**Document Status:** Implemented & Verified  
**Target Role:** Full Stack Developer Assessment (Turium AI)  
**Timebox:** 6–12 Hours real work (Submission within 2–3 calendar days)  
**Authors:** Candidate (Full Stack Engineering) & Turium AI Evaluation Team  

---

## 1. Executive Summary & Objective

The **AI Knowledge Inbox** is a production-grade full-stack web application designed as a personal second-brain knowledge inbox. Users can save arbitrary plain text notes and web URLs, which are ingested, parsed, chunked, and embedded into a vector space. Users can subsequently query their repository of knowledge in natural language, receiving strictly grounded, hallucination-resistant answers with direct source citations and relevance snippets.

### Core Objectives
1. **End-to-End Cohesion:** Seamless integration of modern React frontend, RESTful FastAPI backend, asynchronous background pipeline, and an AI retrieval-augmented generation (RAG) pipeline.
2. **Tradeoff Awareness:** Demonstrating senior-level decision making around chunking strategies, vector storage, web crawling limitations, and scale bottlenecks.
3. **Engineering Rigor:** Clean architecture, modular separation of concerns, ANSI color-coded structured logging with credential masking, typed API contracts, and robust error boundaries without overengineering infrastructure.
4. **Zero-Setup Reviewer Experience:** Automated deterministic offline mock engine fallback so evaluators can test the entire pipeline locally without requiring paid API keys.

---

## 2. User Personas & Core Use Cases

### 2.1 Persona
- **Knowledge Worker / Researcher:** Needs a quick, friction-free place to dump thoughts, snippets, documentation links, and articles, and later ask synthesis questions without manually organizing folders or tags.

### 2.2 Key User Journeys
1. **Quick Ingestion (Text Note):**
   - User types or pastes quick thoughts/meeting notes.
   - Clicks *Save Note* -> Note is immediately stored and vectorized -> Available for retrieval within seconds.
2. **Web Content Ingestion (URL):**
   - User pastes an article or documentation link (e.g., tech blog post, essay).
   - System fetches page server-side, strips HTML tags/scripts/ads via Trafilatura, extracts readable body text, titles, OpenGraph/Twitter descriptions, and metadata.
   - Content is chunked and embedded asynchronously without blocking the user.
3. **Knowledge Retrieval & Q&A:**
   - User queries: *"What are the core tradeoffs of SQLite concurrency discussed in my saved notes?"*
   - System retrieves top-$k$ semantically relevant chunks across all stored items via vectorized cosine similarity.
   - System synthesizes a concise, grounded answer formatted in rich Markdown citing exact sources (e.g., `[1]`, `[2]`).
   - User can click inline citations to scroll to and highlight original source snippets, similarity scores, and timestamps.

---

## 3. Functional Requirements

### FR-1: Content Ingestion Engine
- **FR-1.1 Plain Text Notes:** Support UTF-8 multiline text input with title (optional) and content body.
- **FR-1.2 URL Ingestion & Web Scraping:**
  - Server-side fetch of target URL with user-agent emulation and timeout limits (12s).
  - HTML extraction using readability heuristics (removing `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`, and ads).
  - Extraction of title (`og:title` -> `<title>` -> domain path fallback), body text, and meta descriptions (`og:description`, `twitter:description`, `meta[name=description]`).
  - Graceful fallback for dynamic client-rendered JavaScript SPAs with helpful actionable UI error messages.
- **FR-1.3 Content Metadata Storage:**
  - Persist Item metadata: `id` (UUIDv4/UUIDv5), `type` (`note` | `url`), `title`, `source_url`, `raw_content`, `created_at`, `chunk_count`, `status` (`pending` | `ready` | `failed`), `error_message`.

### FR-2: Async Processing & Chunking Strategy
- **FR-2.1 Non-blocking Ingestion:** URL fetching and embedding generation do not block HTTP requests. Handled via FastAPI `BackgroundTasks` returning HTTP `202 Accepted` with real-time UI polling updates.
- **FR-2.2 Recursive Character Chunking:**
  - Chunk size: **600 characters (~120 tokens)**.
  - Chunk overlap: **100 characters (~20 tokens)**.
  - Separators hierarchy: `["\n\n", "\n", ". ", " ", ""]` to preserve natural sentence boundaries.
  - Metadata preservation per chunk: `id`, `item_id`, `chunk_index`, `chunk_text`, `embedding` (serialized binary BLOB).

### FR-3: Embeddings & Vector Storage
- **FR-3.1 Embedding Generation:**
  - Primary Provider: Google Gemini **`gemini-embedding-001`** (3072 dims) or `gemini-embedding-2`.
  - Fallback Provider: Deterministic 768-dim hash-based mock embedding engine when running without an API key.
  - Deprecated filter: Automatically blacklists legacy models (`text-embedding-004`).
- **FR-3.2 Vector Storage & Similarity Search:**
  - Storage: Embedded SQLite (`inbox.db`) with Write-Ahead Logging (`PRAGMA journal_mode=WAL`), foreign key cascades, and binary vector BLOBs (`np.float32`).
  - Similarity metric: Vectorized **NumPy Cosine Similarity** with dimension mismatch safety guards.
  - Query vectorization and Top-$K$ retrieval (configurable default: $K = 4$ chunks).

### FR-4: Grounded RAG Query Pipeline
- **FR-4.1 Context Assembly:**
  - Retrieved chunks are deduplicated and formatted into structured context blocks with clear identifiers:
    ```
    [Source 1: Title | Chunk 0]
    <chunk_text>
    ```
- **FR-4.2 Prompt Engineering & Hallucination Prevention:**
  - Strict system prompt instructing the LLM:
    - Answer **only** based on the provided context snippets.
    - If the context does not contain sufficient information, explicitly state: *"I cannot find information about this in your saved inbox."*
    - Cite source numbers inline using bracketed notation `[1]`, `[2]`.
    - Format answers using clean markdown (bold emphasis, bulleted lists, code styling).
  - Primary LLM: **`gemini-3.5-flash-lite`** (with automated fallback chain: `gemini-flash-latest` -> `gemini-3.5-flash`).
  - Automatic Function Calling (AFC) disabled to prevent SDK console warnings.
- **FR-4.3 Structured Response Model:**
  - The API returns:
    - Synthesized `answer` (Markdown formatted).
    - Array of `citations` with: `citation_id`, `item_id`, `title`, `source_type`, `source_url`, `chunk_index`, `chunk_text`, and `similarity_score`.
    - Metadata: `model`, `is_mock`.

### FR-5: Frontend UI/UX
- **FR-5.1 Layout & Design System:**
  - Built with React 18 + Vite + TypeScript + Tailwind CSS.
  - Notion/Linear-inspired 6-color token system with full dark/light theme support.
  - State management via **Zustand** (<1KB bundle size) with `isInitialized` guard to prevent React StrictMode duplicate network calls.
- **FR-5.2 Split-View Architecture:**
  - **Left Column:** Knowledge Inbox (List of saved notes & URLs with status badges, search/filter, and Ingest Modal/Drawer).
  - **Right Column:** AI Assistant Q&A Console (Query input, quick sample prompts, loading indicator, grounded response, and citation cards).
- **FR-5.3 Ingestion Controls:**
  - Tabbed interface for "Paste Note" vs "Add URL".
  - Real-time status indicators (`PENDING`, `READY`, `FAILED`) with optimistic UI updates.
  - Drawer to view full original raw content.
- **FR-5.4 Interactive Citations & Markdown Rendering:**
  - `react-markdown` integration supporting bold headers, bullet lists, and code blocks.
  - Bracketed citations `[1]`, `[2]` dynamically parsed into interactive clickable buttons.
  - Clicking a citation smoothly scrolls to and pulses the target source card.

---

## 4. API Specification & Contracts

### 4.1 `POST /api/ingest`
Ingests a new text note or remote URL.

**Request Payload:**
```json
{
  "type": "note", // "note" | "url"
  "title": "Optional Custom Title",
  "content": "Raw plain text content...", // Required if type === "note"
  "url": "https://example.com/article"    // Required if type === "url"
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Note ingested and indexed successfully",
  "data": {
    "id": "50647456-4ef8-5f0e-a135-cbebc1f3d15c",
    "type": "note",
    "title": "SQLite Production Concurrency & WAL Mode",
    "source_url": null,
    "status": "ready",
    "chunk_count": 1,
    "created_at": "2026-10-02T14:00:00Z"
  }
}
```

### 4.2 `GET /api/items`
Retrieves all saved items with pagination and status.

**Query Parameters:**
- `limit` (int, default 50)
- `offset` (int, default 0)
- `type` (optional: `note` | `url`)

**Response (200 OK):**
```json
{
  "success": true,
  "total": 3,
  "items": [
    {
      "id": "50647456-4ef8-5f0e-a135-cbebc1f3d15c",
      "type": "note",
      "title": "SQLite Production Concurrency & WAL Mode",
      "source_url": null,
      "status": "ready",
      "chunk_count": 1,
      "created_at": "2026-10-02T14:00:00Z"
    }
  ]
}
```

### 4.3 `DELETE /api/items/{id}`
Deletes an ingested item and cascades deletion to all associated vector chunks.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Item 50647456-4ef8-5f0e-a135-cbebc1f3d15c and 1 associated chunks deleted."
}
```

### 4.4 `POST /api/query`
Executes semantic retrieval and grounded LLM generation.

**Request Payload:**
```json
{
  "query": "What are the main tradeoffs of SQLite concurrency?",
  "top_k": 4
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "query": "What are the main tradeoffs of SQLite concurrency?",
  "answer": "Based on your saved notes, the main tradeoffs of SQLite concurrency are:\n\n* **High Read Concurrency:** Under **Write-Ahead Logging (WAL) mode**, readers do not block writers, and a writer does not block readers [1].\n* **Database-Level Write Locking:** SQLite allows **only one process or thread to write at any instant** [1].\n* **Lock Contention:** High sustained write workloads encounter `SQLITE_BUSY` timeouts [1].",
  "citations": [
    {
      "citation_id": 1,
      "item_id": "50647456-4ef8-5f0e-a135-cbebc1f3d15c",
      "title": "SQLite Production Concurrency & WAL Mode",
      "source_type": "note",
      "source_url": null,
      "chunk_index": 0,
      "chunk_text": "SQLite supports high-concurrency read workloads when Write-Ahead Logging (WAL) mode is enabled...",
      "similarity_score": 0.7928
    }
  ],
  "model": "gemini-3.5-flash-lite",
  "is_mock": false
}
```

### 4.5 `GET /api/health`
System health check and runtime status.

**Response (200 OK):**
```json
{
  "status": "ok",
  "mock_mode": false,
  "llm_model": "gemini-3.5-flash-lite",
  "embedding_model": "gemini-embedding-001",
  "total_items": 3,
  "total_chunks": 3
}
```

---

## 5. Non-Functional Requirements & Design Decisions

### NFR-1: Tradeoff Awareness (Evaluation Criteria)
1. **Chunking Strategy Tradeoffs:**
   - *Chosen Approach:* Fixed-window recursive character chunking (600 chars, 100 overlap).
   - *Tradeoff:* Extremely fast, deterministic, zero external dependencies. Preserves sentence and paragraph boundaries via hierarchical separators `["\n\n", "\n", ". ", " ", ""]`.
   - *Limitation:* Does not dynamically adapt to semantic topic boundaries or table formats.
   - *Production Alternative:* Semantic chunking (embedding distance between adjacent sentences) or AST-based Markdown/HTML chunking.
2. **Vector Store Selection:**
   - *Chosen Approach:* Embedded SQLite with vector storage (`BLOB` serialized `float32`) and NumPy vectorized cosine similarity.
   - *Tradeoff:* Zero-friction setup, zero external Docker daemon requirements, instant local execution for interview reviewers.
   - *Limitation:* Linear scan is $O(N \cdot D)$; at $> 100,000$ chunks, query latency increases.
   - *Production Alternative:* pgvector (PostgreSQL) or Qdrant/Pinecone with dedicated indexing (HNSW / IVFFlat).
3. **What Breaks at Scale:**
   - *Scraping:* IP rate limits, Cloudflare anti-bot challenges, JavaScript-heavy SPAs that require headless browser rendering (Playwright).
   - *Linear Scan / In-Memory Search:* As chunk count exceeds $10^5$, brute-force cosine distance search becomes a bottleneck.
   - *LLM Rate Limits:* High concurrent query volumes will exhaust Requests Per Minute (RPM) limits on cloud providers.
4. **Production Architecture Evolution:**
   - Decouple scraping and chunking to a persistent task queue (Celery + Redis or BullMQ).
   - Add Playwright browser cluster for dynamic client-rendered web pages.
   - Introduce Hybrid Search (BM25 keyword search + Dense Vector search with Reciprocal Rank Fusion) and Cross-Encoder Reranking (Cohere Rerank) to boost precision.
   - Implement streaming responses (SSE - Server-Sent Events) for real-time token delivery to the client.

### NFR-2: Observability & Debuggability
- **ANSI Color-Coded Structured Logging:** All backend events logged with colored service tags (`[APP]`, `[GEMINI]`, `[RAG]`, `[INGEST]`), colored HTTP status codes (2xx Green, 4xx Yellow, 5xx Red), and request durations.
- **Sensitive Data Masking:** Integrated `SensitiveDataFilter` to automatically redact API keys, bearer tokens, and credentials from all console and application logs.
- **Sanitized Error Responses:** No raw stack traces exposed to client; typed error codes (`SCRAPER_FAILED`, `DB_ERROR`, `NOT_FOUND`, `INVALID_REQUEST`).
- **HTTP Semantics:** Strict adherence to status codes:
  - `200 OK` (Standard query/fetch/health)
  - `202 Accepted` (Ingest job queued/processed asynchronously)
  - `400 Bad Request` (Invalid URL / empty note)
  - `422 Unprocessable Content` (Pydantic schema validation failure)
  - `502 Bad Gateway` (Remote URL unreachable/blocked)
  - `500 Internal Error` (Catch-all with logged traceback)

### NFR-3: Code Quality & Architecture Standards
- **Modular Architecture:** Clean separation between `api/` (controllers), `services/` (scraper, chunker, ai_service, rag), `db/` (repository, database, schema), and `core/` (logger, config, exceptions).
- **Typing & Validation:** Strict TypeScript on frontend; Pydantic for backend request validation and schema enforcement.
- **Dockerization Scope:** Backend is containerized in `backend/` (`knowledge_inbox_backend` on port `8000`), while frontend runs locally (`npm run dev` on port `5173`) with proxy to `http://127.0.0.1:8000` to prevent IPv6 localhost connection refusals.

---

## 6. Project Scope & Non-Goals

### In Scope
- Plain text ingestion & remote URL content scraping with metadata fallback.
- Server-side text cleaning and smart recursive character chunking.
- Vector embedding, indexing, and Top-$K$ semantic similarity search.
- LLM response generation with strict context grounding and citation mapping.
- Polished, responsive React interface with real-time feedback and citation inspection.
- Comprehensive `README.md` documenting architecture, tradeoffs, and local run guide.

### Out of Scope (Intentional Exclusions)
- User authentication & multi-tenant permissions (Single-user design for the assignment).
- Heavy microservice or Kubernetes infrastructure (violates assignment mandate against overengineering).
- PDF/Word/Audio file parsing (focused strictly on plain text and URLs as specified).
- Complex custom fine-tuned models.