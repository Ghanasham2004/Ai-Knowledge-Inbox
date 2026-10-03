# AI Knowledge Inbox

> A production-style, minimalist second-brain web application for saving notes and web articles, indexing them into a semantic vector space, and asking questions powered by an asynchronous RAG (Retrieval-Augmented Generation) pipeline with grounded inline citations.

Built for the **Turium AI Full Stack Developer** assessment.

---

## 🌟 Key Features

- **Asynchronous Content Ingestion:**
  - **Text Notes:** Plain text input with instant chunking and vector indexing.
  - **Web Articles (URLs):** Non-blocking server-side fetching with boilerplate/ad/script removal via `trafilatura` and `BeautifulSoup4`.
  - Responds immediately with `202 Accepted` while background tasks index chunks without freezing HTTP workers.
- **Intentional Chunking & Vector Search:**
  - Recursive character splitting (600 chars, 100 char overlap) preserving sentence structure and punctuation boundaries.
  - Embedded vector storage using SQLite + binary serialized vectors with vectorized NumPy cosine similarity search.
- **Grounded RAG Pipeline & Inline Citations:**
  - Strictly grounded prompts instructing the LLM to only state verifiable facts from retrieved context.
  - Interactive clickable citation tags `[1]`, `[2]` in answers that scroll to and highlight the exact matching source snippet and similarity percentage.
- **Google Gemini & Offline Mock Fallback:**
  - Uses Google Gemini (`gemini-3.5-flash-lite` + `gemini-embedding-001`) for high-quality, **100% free** inference.
  - **Zero-Setup Reviewer Mode:** If no `GEMINI_API_KEY` is provided, the system automatically falls back to an offline deterministic vector matcher so reviewers can test the app without configuring keys.
- **Clean "Linear/Notion" Aesthetic & UX:**
  - Centralized 6-color design token system, light/dark mode toggle, and state management via **Zustand** (<1KB bundle size).
  - Client-side persistence for recent queries & answer history across reloads.
  - Dynamic error handling with 1-click retry mechanisms for network/scraping edge cases.

---

## 🏗️ Architecture & System Design

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React (Vite + TS + Tailwind)                   │
│                                                                        │
│   ┌──────────────────────────┐         ┌───────────────────────────┐  │
│   │   Knowledge Inbox View   │         │    AI Q&A / RAG Console   │  │
│   │  - Note / URL Ingest Form│         │  - Query Input & Samples  │  │
│   │  - Saved Items & Badges  │         │  - Grounded Answer View   │  │
│   │  - Raw Content Drawer    │         │  - Interactive Citations  │  │
│   └─────────────┬────────────┘         └─────────────▲─────────────┘  │
│                 │                                    │                │
│                 └──────────────┬─────────────────────┘                │
│                                │ Zustand Store                        │
│                                ▼                                      │
│                        LocalStorage Cache                             │
└────────────────────────────────┼──────────────────────────────────────┘
                  │ HTTP REST API (FastAPI)
                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           FastAPI Backend (Docker)                     │
│                                                                        │
│  ┌──────────────────────┐  Async Worker ┌───────────────────────────┐ │
│  │ Ingestion Controller ├──────────────►│ Async Ingestion Pipeline  │ │
│  │ (POST /api/ingest)   │               │ - Web Scraper / Cleaner   │ │
│  └──────────────────────┘               │ - Recursive Chunker       │ │
│                                         │ - Gemini Embedder (3072d) │ │
│  ┌──────────────────────┐               └─────────────┬─────────────┘ │
│  │ Items Controller     │                             │               │
│  │ (GET/DEL /api/items) │                             ▼               │
│  └──────────────────────┘               ┌───────────────────────────┐ │
│                                         │      Storage Layer        │ │
│  ┌──────────────────────┐               │ - SQLite (Metadata/Items) │ │
│  │ RAG Query Controller ├──────────────►│ - Vector Index (Chunks &  │ │
│  │ (POST /api/query)    │ Top-K Chunks  │   Embedding Cosine Sim)   │ │
│  └──────────┬───────────┘               └─────────────┬─────────────┘ │
│             │                                         │               │
│             ▼                                         │               │
│  ┌──────────────────────────────────────────────┐     │               │
│  │       RAG Synthesis Service (Gemini)         │◄────┘               │
│  │  - Context Formatter & Citation Mapper       │                     │
│  │  - Strict Grounding (gemini-3.5-flash-lite)  │                     │
│  └──────────────────────────────────────────────┘                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```text
ai-knowledge-inbox/
├── backend/
│   ├── app/
│   │   ├── api/            # REST API endpoints (ingest, items, query)
│   │   ├── core/           # Logging & custom exception handlers
│   │   ├── db/             # SQLite connection & repository layer
│   │   ├── schemas/        # Pydantic request/response models
│   │   └── services/       # Async chunker, web scraper, RAG & Gemini client
│   ├── tests/              # Pytest unit & integration test suite
│   ├── docker-compose.yml  # Docker container configuration
│   ├── Dockerfile          # Backend container image definition
│   ├── requirements.txt    # Python dependencies
│   ├── seed.py             # Pre-seeded sample notes and articles
│   ├── .env.example        # Environment variable template
│   └── .gitignore
├── frontend/
│   ├── src/
│   │   ├── api/            # Typed Axios client & query hooks
│   │   ├── components/     # Inbox, Ingest modal, RAG console, Citations
│   │   ├── store/          # Lightweight Zustand state management
│   │   └── types/          # TypeScript interfaces
│   ├── package.json
│   ├── vite.config.ts      # Vite dev server + proxy configuration
│   ├── .env.example
│   └── .gitignore
├── PRD.md                  # Comprehensive Product Requirements Document
├── .gitignore              # Root gitignore (protects secrets, DBs & internal notes)
└── README.md               # Architecture, design decisions, and setup guide
```

---

## 🎯 Design Decisions & Tradeoffs Analysis

### 1. Chunking Strategy & Rationale
- **Chosen Approach:** Fixed-window recursive character chunking (600 characters target, 100 character overlap) splitting on `["\n\n", "\n", ". ", " ", ""]`.
- **Tradeoff:** Recursive splitting is deterministic, fast, and does not depend on model inference. By respecting sentence boundaries (`. `) and paragraph breaks (`\n\n`), chunks remain semantically coherent.
- **Limitations:** Does not account for semantic shifts inside paragraphs or structured tables.
- **Production Evolution:** At scale, transition to **Semantic Chunking** (measuring cosine distance between adjacent sentence embeddings to find natural topic boundaries) and **Layout-Aware Parsing** (Markdown/HTML AST extraction to preserve tables and headers).

### 2. Vector Store Choice
- **Chosen Approach:** Embedded SQLite with BLOB serialized vectors and vectorized NumPy cosine similarity.
- **Tradeoff:** Zero-setup friction for local evaluation and single-user productivity. Reviewers do not need to install or run external vector daemons (like Pinecone, Milvus, or Qdrant).
- **Limitations:** In-memory or brute-force scanning scales linearly $O(N \cdot D)$. For $N > 50,000$ chunks, query latency increases.
- **Production Evolution:** Migrate to **pgvector (PostgreSQL)** or **Qdrant** with Hierarchical Navigable Small World (**HNSW**) indexing, providing $O(\log N)$ logarithmic nearest-neighbor search.

### 3. What Breaks at Scale (Bottlenecks & Mitigations)
1. **Web Scraping:**
   - *Failure Mode:* Websites with Cloudflare anti-bot captchas, IP rate limits, or heavy client-rendered Single Page Applications (React/Vue SPAs) will fail with simple HTTP requests.
   - *Mitigation:* Offload scraping to distributed headless browser clusters (Playwright / Puppeteer with proxy rotation).
2. **Embedding & LLM Rate Limits:**
   - *Failure Mode:* Bulk document ingestion exhausts Token-Per-Minute (TPM) limits on Gemini/OpenAI.
   - *Mitigation:* Implement rate-limited task queues with exponential backoff (Celery / BullMQ + Redis).
3. **Linear Scan Latency:**
   - *Failure Mode:* As chunks exceed $10^5$, CPU memory and linear dot product scans slow down.
   - *Mitigation:* Vector indexing with HNSW/IVFFlat and vector quantization (FP16/INT8).

### 4. Production Roadmap
- **Hybrid Search:** Combine dense vector embeddings with sparse BM25 keyword search using Reciprocal Rank Fusion (RRF) to excel at both semantic meaning and exact keyword/acronym lookups.
- **Cross-Encoder Reranking:** Add Cohere Rerank or BGE-Reranker on the top-20 retrieved chunks to eliminate false positives before sending to the LLM.
- **Server-Sent Events (SSE):** Stream tokens in real time to the React UI for sub-second perceived response latency.
- **Multi-Tenancy & Auth:** Row-level security (RLS) on PostgreSQL for secure multi-user data isolation.

---

## 📡 API Reference

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ingest` | Ingest plain note or URL (Queues async indexing) | `202 Accepted` |
| `GET` | `/api/items` | List saved items with status and chunk counts | `200 OK` |
| `GET` | `/api/items/{id}` | Retrieve item details (cleaned content & raw input)| `200 OK` |
| `DELETE`| `/api/items/{id}` | Delete item and cascade delete vector chunks | `200 OK` |
| `POST` | `/api/query` | Semantic search and grounded LLM answer with citations | `200 OK` |
| `GET` | `/api/health` | Health check, item count, and active AI model | `200 OK` |

---

## 🧪 Automated Testing

Automated unit and integration tests verify the core RAG components:
```bash
# Run tests inside the running Docker container
docker compose -f backend/docker-compose.yml exec backend pytest -v

# OR run locally with native pytest (inside backend/ virtualenv)
cd backend && pytest -v
```

Test coverage includes:
- Recursive character splitting & overlap boundary preservation
- Empty and short text edge cases
- Mock embedding generation and semantic cosine ranking
- Scraper title and text extraction heuristics

---

## 🚀 Complete Installation & Setup Guide

### Prerequisites
- **Git** installed on your machine
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose *(Recommended)* OR **Python 3.10+**
- [Node.js](https://nodejs.org/) v18+ & npm

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Ghanasham2004/ai-knowledge-inbox.git
cd ai-knowledge-inbox
```

---

### Step 2: Configure Environment Variables
Copy the backend environment template:
```bash
cp backend/.env.example backend/.env
```

> **Reviewer Zero-Setup Mode:**  
> A `GEMINI_API_KEY` is **optional**! If left blank, the application automatically runs in an offline deterministic Mock Mode, generating local semantic embeddings and answers without any external cloud credentials.  
> To enable live Google Gemini responses, get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey) and set:
> ```env
> GEMINI_API_KEY=your_gemini_api_key_here
> ```

---

### Step 3: Run the Backend

#### Option A: Docker (Recommended)
```bash
cd backend
docker compose up -d
```
- The backend will start on **`http://localhost:8000`**.
- Verify health: `curl http://localhost:8000/api/health`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

#### Option B: Native Python (Without Docker)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

### Step 4: Pre-Seed Sample Data (Optional)
To quickly populate the inbox with sample technical notes and real-world engineering articles:

```bash
# If running via Docker:
docker exec knowledge_inbox_backend python seed.py

# If running natively:
cd backend && python seed.py
```

---

### Step 5: Run the Frontend (React + Vite)
In a new terminal window from the root project directory:
```bash
cd frontend
npm install
npm run dev
```

Open your browser at:
👉 **`http://localhost:5173`**

The frontend is pre-configured with a Vite reverse proxy directing all `/api/*` requests to `http://127.0.0.1:8000`, preventing CORS friction or IPv6 localhost discrepancies.

---

## 🛠️ Verification & Smoke Test

1. **Ingest a Note:**
   - Click **"Add Knowledge"** in the top bar.
   - Choose **"Paste Note"**, enter a title and some text (e.g., facts about your favorite framework), then submit.
   - Note is chunked and indexed immediately.
2. **Ingest a URL:**
   - In the modal, choose **"Add URL"** and paste an article link (e.g., Wikipedia or an engineering blog).
   - Ingestion starts asynchronously with a `PENDING` badge, transitioning to `READY` within seconds.
3. **Ask a Question:**
   - In the AI Assistant console on the right, type a question relating to your notes.
   - Review the grounded answer with inline citations `[1]`, `[2]`.
   - Click any citation badge to smoothly scroll to and highlight the exact source chunk.
