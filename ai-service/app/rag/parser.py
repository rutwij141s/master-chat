import os
import io
import re
import httpx
from typing import List, Dict, Any, Tuple
from bs4 import BeautifulSoup
from pypdf import PdfReader
from docx import Document as DocxDocument


class DocumentParser:
    """Parses various file types (PDF, DOCX, TXT, MD, URL) into structured text pages."""

    @staticmethod
    def parse_pdf(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
        pages = []
        reader = PdfReader(io.BytesIO(file_bytes))
        for page_idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            text = re.sub(r"\s+", " ", text).strip()
            if text:
                pages.append({
                    "text": text,
                    "page_number": page_idx + 1,
                    "source": filename,
                })
        return pages

    @staticmethod
    def parse_docx(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
        doc = DocxDocument(io.BytesIO(file_bytes))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        full_text = "\n\n".join(paragraphs)
        return [{
            "text": full_text,
            "page_number": 1,
            "source": filename,
        }]

    @staticmethod
    def parse_text(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
        text = file_bytes.decode("utf-8", errors="replace").strip()
        return [{
            "text": text,
            "page_number": 1,
            "source": filename,
        }]

    @classmethod
    async def parse_url(cls, url: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        # Remove script and style tags
        for element in soup(["script", "style", "nav", "footer", "header", "noscript"]):
            element.decompose()

        title = soup.title.string.strip() if soup.title and soup.title.string else url
        body_text = soup.get_text(separator="\n")
        lines = [line.strip() for line in body_text.splitlines() if line.strip()]
        clean_text = "\n".join(lines)

        return [{
            "text": f"Title: {title}\nURL: {url}\n\n{clean_text}",
            "page_number": 1,
            "source": url,
        }]

    @classmethod
    def parse(cls, file_bytes: bytes, filename: str, content_type: str = "") -> List[Dict[str, Any]]:
        ext = os.path.splitext(filename)[1].lower()
        if ext == ".pdf" or "pdf" in content_type:
            return cls.parse_pdf(file_bytes, filename)
        elif ext in [".docx", ".doc"] or "word" in content_type:
            return cls.parse_docx(file_bytes, filename)
        elif ext in [".txt", ".md", ".markdown", ".csv", ".json", ".log"]:
            return cls.parse_text(file_bytes, filename)
        else:
            # Default to text decoding
            return cls.parse_text(file_bytes, filename)
