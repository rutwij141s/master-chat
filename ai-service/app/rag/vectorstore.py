import os
import logging
import chromadb
from typing import List, Dict, Any, Optional
import numpy as np
from app.config import get_settings
from app.rag.embeddings import embedding_service

logger = logging.getLogger(__name__)


class ChromaManager:
    """Manages ChromaDB collections, vector embeddings, and MMR retrieval with per-user isolation."""

    def __init__(self):
        self.settings = get_settings()
        os.makedirs(self.settings.CHROMA_PERSIST_DIR, exist_ok=True)

        if self.settings.CHROMA_HOST:
            try:
                self.client = chromadb.HttpClient(
                    host=self.settings.CHROMA_HOST,
                    port=self.settings.CHROMA_PORT,
                )
                logger.info(f"Connected to ChromaDB HttpClient at {self.settings.CHROMA_HOST}:{self.settings.CHROMA_PORT}")
            except Exception as e:
                logger.warning(f"HttpClient connection failed: {e}. Falling back to PersistentClient.")
                self.client = chromadb.PersistentClient(path=self.settings.CHROMA_PERSIST_DIR)
        else:
            self.client = chromadb.PersistentClient(path=self.settings.CHROMA_PERSIST_DIR)
            logger.info(f"Initialized ChromaDB PersistentClient at {self.settings.CHROMA_PERSIST_DIR}")

    def _get_collection_name(self, user_id: str) -> str:
        # Chroma collection names must be 3-63 chars, alphanumeric with - or _
        safe_id = str(user_id).replace("-", "_")
        return f"user_{safe_id}"[:63]

    def get_or_create_collection(self, user_id: str):
        collection_name = self._get_collection_name(user_id)
        return self.client.get_or_create_collection(
            name=collection_name,
            metadata={"user_id": str(user_id)},
            embedding_function=embedding_service,
        )

    def add_chunks(self, user_id: str, chunks: List[Dict[str, Any]]) -> int:
        if not chunks:
            return 0
        collection = self.get_or_create_collection(user_id)

        ids = [c["id"] for c in chunks]
        documents = [c["text"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]

        # Generate embeddings explicitly
        embeddings = embedding_service.embed_documents(documents)

        collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        return len(chunks)

    def delete_document_chunks(self, user_id: str, document_id: str) -> None:
        try:
            collection = self.get_or_create_collection(user_id)
            collection.delete(where={"document_id": str(document_id)})
        except Exception as e:
            logger.warning(f"Error deleting chunks for document {document_id}: {e}")

    def get_overview_chunks(
        self,
        user_id: str,
        doc_ids: Optional[List[str]] = None,
        limit: int = 8,
    ) -> List[Dict[str, Any]]:
        """Retrieve sequential opening chunks for high-level document summarization and overviews."""
        try:
            collection = self.get_or_create_collection(user_id)
            if collection.count() == 0:
                return []

            where_filter = None
            if doc_ids:
                if len(doc_ids) == 1:
                    where_filter = {"document_id": str(doc_ids[0])}
                else:
                    where_filter = {"$or": [{"document_id": str(did)} for did in doc_ids]}

            res = collection.get(
                where=where_filter,
                limit=limit,
                include=["documents", "metadatas"],
            )

            chunks = []
            if res and res.get("ids"):
                for idx in range(len(res["ids"])):
                    chunks.append({
                        "id": res["ids"][idx],
                        "text": res["documents"][idx],
                        "metadata": res["metadatas"][idx] or {},
                        "score": 1.0,
                    })
            # Order chunks by original document position
            chunks.sort(key=lambda x: x["metadata"].get("chunk_index", 0))
            return chunks
        except Exception as exc:
            logger.warning(f"get_overview_chunks error: {exc}")
            return []

    def query_similarity(
        self,
        user_id: str,
        query_text: str,
        doc_ids: Optional[List[str]] = None,
        top_k: int = 4,
    ) -> List[Dict[str, Any]]:
        collection = self.get_or_create_collection(user_id)
        where_filter = None
        if doc_ids:
            if len(doc_ids) == 1:
                where_filter = {"document_id": str(doc_ids[0])}
            else:
                where_filter = {"$or": [{"document_id": str(did)} for did in doc_ids]}

        query_embedding = embedding_service.embed_query(query_text)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, max(1, collection.count())),
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        chunks = []
        if results and results.get("ids") and len(results["ids"]) > 0:
            for idx in range(len(results["ids"][0])):
                chunks.append({
                    "id": results["ids"][0][idx],
                    "text": results["documents"][0][idx] if results.get("documents") else "",
                    "metadata": results["metadatas"][0][idx] if results.get("metadatas") else {},
                    "score": 1.0 - (results["distances"][0][idx] if results.get("distances") else 0.0),
                })
        return chunks

    def query_mmr(
        self,
        user_id: str,
        query_text: str,
        doc_ids: Optional[List[str]] = None,
        top_k: int = 4,
        fetch_k: int = 12,
        lambda_mult: float = 0.5,
    ) -> List[Dict[str, Any]]:
        """
        Maximal Marginal Relevance (MMR) retrieval for diverse, non-redundant grounding chunks.
        """
        collection = self.get_or_create_collection(user_id)
        count = collection.count()
        if count == 0:
            return []

        where_filter = None
        if doc_ids:
            if len(doc_ids) == 1:
                where_filter = {"document_id": str(doc_ids[0])}
            else:
                where_filter = {"$or": [{"document_id": str(did)} for did in doc_ids]}

        query_embedding = embedding_service.embed_query(query_text)
        actual_fetch_k = min(fetch_k, count)

        raw_results = collection.query(
            query_embeddings=[query_embedding],
            n_results=actual_fetch_k,
            where=where_filter,
            include=["documents", "metadatas", "embeddings"],
        )

        if not raw_results or not raw_results.get("ids") or len(raw_results["ids"][0]) == 0:
            return []

        doc_embeddings = raw_results.get("embeddings", [[]])[0]
        if doc_embeddings is None or len(doc_embeddings) == 0:
            # Fall back to standard similarity if embeddings not returned
            return self.query_similarity(user_id, query_text, doc_ids, top_k)

        # Compute MMR
        q_vec = np.array(query_embedding)
        doc_vecs = np.array(doc_embeddings)

        # Cosine similarities to query
        q_norm = np.linalg.norm(q_vec) or 1.0
        doc_norms = np.linalg.norm(doc_vecs, axis=1)
        doc_norms[doc_norms == 0] = 1.0
        query_sims = np.dot(doc_vecs, q_vec) / (doc_norms * q_norm)

        selected_indices: List[int] = []
        unselected_indices = list(range(len(query_sims)))

        # Pairwise document cosine similarities
        pairwise_sims = np.dot(doc_vecs, doc_vecs.T) / np.outer(doc_norms, doc_norms)

        actual_top_k = min(top_k, len(unselected_indices))
        while len(selected_indices) < actual_top_k and unselected_indices:
            if not selected_indices:
                best_idx = int(np.argmax(query_sims[unselected_indices]))
                selected_idx = unselected_indices[best_idx]
            else:
                mmr_scores = []
                for idx in unselected_indices:
                    sim_to_query = query_sims[idx]
                    max_sim_to_selected = max(pairwise_sims[idx][s] for s in selected_indices)
                    score = lambda_mult * sim_to_query - (1 - lambda_mult) * max_sim_to_selected
                    mmr_scores.append(score)
                best_sub_idx = int(np.argmax(mmr_scores))
                selected_idx = unselected_indices[best_sub_idx]

            selected_indices.append(selected_idx)
            unselected_indices.remove(selected_idx)

        # Build output objects
        final_chunks = []
        for s_idx in selected_indices:
            final_chunks.append({
                "id": raw_results["ids"][0][s_idx],
                "text": raw_results["documents"][0][s_idx],
                "metadata": raw_results["metadatas"][0][s_idx],
                "score": float(query_sims[s_idx]),
            })

        return final_chunks


vector_store = ChromaManager()
