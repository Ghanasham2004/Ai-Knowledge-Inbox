import hashlib
import numpy as np
import asyncio
from typing import List, Optional
from app.config import settings
from app.core.logger import get_logger

log = get_logger("GEMINI")

# Lazy load google genai to allow clean offline runs if SDK isn't configured
try:
    from google import genai
    from google.genai import types
    from google.genai.errors import APIError
    HAS_GENAI_SDK = True
except ImportError:
    HAS_GENAI_SDK = False


# Models verified to work seamlessly on Google GenAI API v1beta
VERIFIED_LLM_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3.5-flash",
]

VERIFIED_EMBEDDING_MODELS = [
    "gemini-embedding-001",
    "gemini-embedding-2",
]

# Obsolete or retired model patterns (e.g. 1.5, 2.0, 2.5, text-embedding-004)
DEPRECATED_PATTERNS = ["1.5", "2.0", "2.5", "004"]


def is_deprecated_model(model_name: Optional[str]) -> bool:
    if not model_name:
        return True
    name_lower = model_name.lower().strip()
    return any(p in name_lower for p in DEPRECATED_PATTERNS)


class AIService:
    _client = None

    @classmethod
    def get_client(cls):
        if not HAS_GENAI_SDK:
            return None
        if cls._client is None and settings.GEMINI_API_KEY:
            cls._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return cls._client

    @classmethod
    def generate_mock_embedding(cls, text: str, dim: int = 768) -> List[float]:
        """
        Generates a deterministic, normalized 768-dim pseudo-vector from text.
        Words and character trigrams map into specific vector buckets,
        ensuring semantic-like keyword overlap produces high cosine similarity.
        """
        vec = np.zeros(dim, dtype=np.float32)
        words = text.lower().split()
        for w in words:
            h = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16)
            idx = h % dim
            sign = 1.0 if (h // dim) % 2 == 0 else -1.0
            vec[idx] += sign

        for i in range(len(text) - 2):
            trigram = text[i:i + 3].lower()
            h = int(hashlib.sha256(trigram.encode("utf-8")).hexdigest(), 16)
            idx = h % dim
            sign = 1.0 if (h // dim) % 2 == 0 else -1.0
            vec[idx] += sign * 0.5

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec[0] = 1.0
        return vec.tolist()

    @classmethod
    async def get_embedding(cls, text: str) -> List[float]:
        """Generates embedding using Gemini or deterministic mock fallback."""
        if settings.is_mock_mode or not HAS_GENAI_SDK:
            return cls.generate_mock_embedding(text)

        client = cls.get_client()
        if not client:
            return cls.generate_mock_embedding(text)

        # Strictly ignore any deprecated model strings (like text-embedding-004)
        embed_candidates = []
        if settings.EMBEDDING_MODEL and not is_deprecated_model(settings.EMBEDDING_MODEL):
            embed_candidates.append(settings.EMBEDDING_MODEL)
        embed_candidates.extend(VERIFIED_EMBEDDING_MODELS)
        embedding_models = list(dict.fromkeys(embed_candidates))

        loop = asyncio.get_event_loop()

        for model in embedding_models:
            def call_embed(m=model):
                resp = client.models.embed_content(
                    model=m,
                    contents=text,
                )
                if hasattr(resp, "embeddings") and resp.embeddings:
                    return resp.embeddings[0].values
                elif hasattr(resp, "embedding"):
                    return resp.embedding.values
                return None

            try:
                emb = await loop.run_in_executor(None, call_embed)
                if emb:
                    return emb
            except Exception as e:
                log.warning(f"Embedding attempt failed on '{model}': {e}")
                continue

        log.warning("All Gemini embedding models failed. Falling back to mock embedding.")
        return cls.generate_mock_embedding(text)

    @classmethod
    async def generate_rag_answer(cls, query: str, context_blocks: List[str]) -> tuple:
        """Generates grounded answer citing sources."""
        if settings.is_mock_mode or not HAS_GENAI_SDK:
            return cls._mock_rag_synthesis(query, context_blocks)

        client = cls.get_client()
        if not client:
            return cls._mock_rag_synthesis(query, context_blocks)

        system_instruction = (
            "You are an AI Knowledge Assistant answering questions strictly over the user's saved notes and articles.\n"
            "Rules:\n"
            "1. Answer ONLY using the facts directly stated in the context snippets below.\n"
            "2. If the context does not contain enough information, state clearly: 'I cannot find information about this in your saved inbox.'\n"
            "3. Cite your sources inline using [1], [2], etc., matching the exact snippet IDs provided in the context.\n"
            "4. Format your answer with clear markdown: use bold text, bullet points, and code styling where appropriate.\n"
            "5. Keep your answer crisp, clear, and informative."
        )

        formatted_context = "\n\n---\n\n".join(context_blocks)
        user_prompt = f"Context from saved inbox:\n{formatted_context}\n\nQuestion: {query}\n\nAnswer:"

        # Strictly ignore any deprecated model strings (like gemini-1.5-flash or gemini-2.5-flash)
        llm_candidates = []
        if settings.LLM_MODEL and not is_deprecated_model(settings.LLM_MODEL):
            llm_candidates.append(settings.LLM_MODEL)
        llm_candidates.extend(VERIFIED_LLM_MODELS)
        models_to_try = list(dict.fromkeys(llm_candidates))

        loop = asyncio.get_event_loop()
        last_error = None

        for model in models_to_try:
            def call_generate(m=model):
                config_kwargs = {
                    "system_instruction": system_instruction,
                    "temperature": 0.2,
                }
                # Explicitly disable AFC to eliminate SDK warnings
                if hasattr(types, "AutomaticFunctionCallingConfig"):
                    config_kwargs["automatic_function_calling"] = types.AutomaticFunctionCallingConfig(disable=True)

                resp = client.models.generate_content(
                    model=m,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(**config_kwargs),
                )
                return resp.text.strip() if resp and resp.text else ""

            try:
                log.info(f"Generating RAG answer using model '{model}'...")
                answer = await loop.run_in_executor(None, call_generate)
                if answer:
                    log.info(f"Successfully generated answer with '{model}'")
                    return answer, model
            except Exception as e:
                last_error = e
                log.warning(f"Generation failed on '{model}': {e}. Trying fallback model...")
                await asyncio.sleep(1)
                continue

        log.error(f"All Gemini models failed. Last error: {last_error}. Falling back to mock synthesis.")
        return cls._mock_rag_synthesis(query, context_blocks)

    @classmethod
    def _mock_rag_synthesis(cls, query: str, context_blocks: List[str]) -> tuple:
        if not context_blocks:
            return "I could not find any relevant information about this in your saved inbox.", "local-mock"

        summary_points = []
        for i, block in enumerate(context_blocks[:3], 1):
            lines = block.split("\n")
            snippet = " ".join(lines[1:]).strip() if len(lines) > 1 else lines[0]
            summary_points.append(f"- According to **Source [{i}]**: \"{snippet[:150]}...\"")

        text = (
            f"Based on your saved inbox content regarding **\"{query}\"**:\n\n"
            + "\n".join(summary_points)
            + "\n\n*(Generated via Local Mock Engine. Set GEMINI_API_KEY for live Gemini Flash synthesis.)*"
        )
        return text, "local-mock"
