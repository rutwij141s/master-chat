import logging
import hashlib
from typing import List
from app.config import get_settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Manages text embeddings via Hugging Face sentence-transformers with fallback."""

    def __init__(self, model_name: str = None):
        self.settings = get_settings()
        self.model_name = model_name or self.settings.EMBEDDING_MODEL
        self._model = None
        self._dimension = 384

    @property
    def model(self):
        if self._model is None:
            if getattr(self.settings, "EMBEDDING_MODEL", "") == "mock":
                self._model = "mock"
                return self._model
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading local embedding model: {self.model_name}")
                self._model = SentenceTransformer(self.model_name, local_files_only=True)
                if hasattr(self._model, "get_embedding_dimension"):
                    self._dimension = self._model.get_embedding_dimension()
                elif hasattr(self._model, "get_sentence_embedding_dimension"):
                    self._dimension = self._model.get_sentence_embedding_dimension()
                else:
                    self._dimension = 384
            except Exception as e:
                logger.info(f"SentenceTransformer not cached locally ({e}). Using deterministic 384-dim fallback.")
                self._model = "mock"
                self._dimension = 384
        return self._model

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed list of texts into vector representations."""
        if self.model == "mock":
            return [self._mock_embed(t) for t in texts]
        embeddings = self.model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return embeddings.tolist()

    def embed_query(self, text: str) -> List[float]:
        """Embed a single search query."""
        if self.model == "mock":
            return self._mock_embed(text)
        embedding = self.model.encode(text, normalize_embeddings=True, show_progress_bar=False)
        return embedding.tolist()

    def _mock_embed(self, text: str) -> List[float]:
        """Deterministic 384-dim pseudo-embedding for testing/mock mode without downloading weights."""
        h = hashlib.sha256(text.encode("utf-8")).digest()
        # Create 384 normalized floats from hash
        vec = [((b / 255.0) * 2.0 - 1.0) for b in (h * 12)[:384]]
        # Normalize
        norm = sum(x * x for x in vec) ** 0.5 or 1.0
        return [x / norm for x in vec]

    def name(self) -> str:
        """ChromaDB embedding function protocol compatibility."""
        return "sentence_transformers_custom"

    def __call__(self, input: List[str]) -> List[List[float]]:
        """ChromaDB embedding function protocol compatibility."""
        return self.embed_documents(input)


embedding_service = EmbeddingService()
