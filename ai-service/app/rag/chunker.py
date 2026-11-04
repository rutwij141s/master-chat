import uuid
from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import get_settings


class DocumentChunker:
    """Splits structured parsed documents into chunks suitable for embedding."""

    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 100):
        self.settings = get_settings()
        self.chunk_size = chunk_size or self.settings.RAG_CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or self.settings.RAG_CHUNK_OVERLAP
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
            keep_separator=True,
        )

    def chunk_pages(
        self,
        pages: List[Dict[str, Any]],
        document_id: str,
        user_id: str,
        filename: str,
    ) -> List[Dict[str, Any]]:
        """Split pages into chunks with full metadata."""
        all_chunks = []
        global_chunk_idx = 0

        for page in pages:
            text = page.get("text", "")
            page_number = page.get("page_number", 1)
            source = page.get("source", filename)

            if not text.strip():
                continue

            sub_chunks = self.splitter.split_text(text)
            for sub_text in sub_chunks:
                chunk_id = f"{document_id}_{global_chunk_idx}"
                all_chunks.append({
                    "id": chunk_id,
                    "text": sub_text,
                    "metadata": {
                        "chunk_id": chunk_id,
                        "document_id": str(document_id),
                        "user_id": str(user_id),
                        "filename": filename,
                        "source": source,
                        "page_number": int(page_number),
                        "chunk_index": global_chunk_idx,
                    }
                })
                global_chunk_idx += 1

        return all_chunks
