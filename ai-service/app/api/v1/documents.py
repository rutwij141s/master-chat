import uuid
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.db.models import Document, DocumentChunkMeta
from app.api.deps import get_current_user_id
from app.schemas.document import DocumentResponse, DocumentListResponse
from app.rag.parser import DocumentParser
from app.rag.chunker import DocumentChunker
from app.rag.vectorstore import vector_store

router_api = APIRouter()
chunker = DocumentChunker()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md", ".markdown", ".csv", ".json"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


@router_api.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload and ingest a document (PDF, DOCX, TXT, MD) or URL into vector store.
    """
    doc_id = uuid.uuid4()

    if file:
        filename = file.filename or "uploaded_document.txt"
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )

        content = await file.read()
        file_size = len(content)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File size exceeds maximum limit of 25MB")

        file_type = ext.replace(".", "")
        pages = DocumentParser.parse(content, filename=filename, content_type=file.content_type or "")
    elif url:
        filename = url
        file_type = "url"
        file_size = 0
        pages = await DocumentParser.parse_url(url)
    else:
        raise HTTPException(status_code=400, detail="Either a file or a URL must be provided")

    # Record document in PostgreSQL
    db_doc = Document(
        id=doc_id,
        user_id=user_id,
        filename=filename,
        file_type=file_type,
        file_size=file_size,
        status="processing",
        chunk_count=0,
    )
    db.add(db_doc)
    await db.commit()

    try:
        # Split into chunks (~800 characters, 100 overlap)
        chunks = chunker.chunk_pages(
            pages=pages,
            document_id=str(doc_id),
            user_id=str(user_id),
            filename=filename,
        )

        # Ingest into ChromaDB with user metadata isolation
        vector_store.add_chunks(user_id=str(user_id), chunks=chunks)

        # Record chunk metadata in PostgreSQL
        for c in chunks:
            chunk_meta = DocumentChunkMeta(
                id=uuid.uuid4(),
                document_id=doc_id,
                user_id=user_id,
                chunk_index=c["metadata"]["chunk_index"],
                chroma_id=c["id"],
                page_number=c["metadata"].get("page_number", 1),
                source=c["metadata"].get("source", filename),
            )
            db.add(chunk_meta)

        db_doc.status = "indexed"
        db_doc.chunk_count = len(chunks)
        await db.commit()
        await db.refresh(db_doc)
        return db_doc

    except Exception as e:
        db_doc.status = "failed"
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to process and index document: {str(e)}")


@router_api.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List all indexed documents for the current user."""
    stmt = (
        select(Document)
        .where(Document.user_id == user_id)
        .order_by(desc(Document.created_at))
    )
    result = await db.execute(stmt)
    docs = result.scalars().all()
    return DocumentListResponse(documents=docs, total=len(docs))


@router_api.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document and purge all associated chunks from ChromaDB."""
    stmt = select(Document).where(
        Document.id == document_id,
        Document.user_id == user_id,
    )
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete from vector store
    vector_store.delete_document_chunks(user_id=str(user_id), document_id=str(document_id))

    # Delete from database
    await db.delete(doc)
    await db.commit()
    return None
