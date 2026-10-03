import pytest
import numpy as np
from app.services.ai_service import AIService


def test_mock_embedding_shape_and_normalization():
    emb = AIService.generate_mock_embedding("Hello world test note")
    assert len(emb) == 768
    norm = np.linalg.norm(np.array(emb, dtype=np.float32))
    assert abs(norm - 1.0) < 1e-4


def test_mock_embedding_similarity():
    emb1 = np.array(AIService.generate_mock_embedding("PostgreSQL database scaling and indexing"), dtype=np.float32)
    emb2 = np.array(AIService.generate_mock_embedding("PostgreSQL database performance tuning"), dtype=np.float32)
    emb3 = np.array(AIService.generate_mock_embedding("Baking chocolate chip cookies recipe"), dtype=np.float32)

    sim_related = np.dot(emb1, emb2)
    sim_unrelated = np.dot(emb1, emb3)

    assert sim_related > sim_unrelated
