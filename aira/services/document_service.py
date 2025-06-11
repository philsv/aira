import asyncio
import io
import logging
import os
import re
import aiosqlite
import uuid
from datetime import datetime
from typing import Optional

import openai
import pdfplumber  # type: ignore[import]
import tiktoken  # type: ignore[import]
from fastapi import UploadFile
from qdrant_client.http.models import PointStruct  # Type hint

from ..models.documents import Document, DocumentStatus
from .qdrant_service import Qdrant
from ..services.s3_upload import S3

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(message)s", datefmt="%d-%b-%y %H:%M:%S"
)

# OpenAI client configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-ada-002")

openai.api_key = OPENAI_API_KEY

# Constants for text processing
ENC = tiktoken.get_encoding("cl100k_base")  # matches tiktoken for gpt models
HEADING_PATTERN = re.compile(
    r"^(?:[IVX]+\.|[A-Z]\.|[0-9]+\.|[0-9]+)\s+", flags=re.MULTILINE
)
MAX_TOKENS_PER_CHUNK = 1500


class DocumentService:
    def __init__(self, db_path: str = "data/documents.db"):
        self.db_path = db_path
        self.documents_db: dict[str, Document] = {}

    async def _init_database(self):
        """Initialize SQLite database with documents table."""
        async with aiosqlite.connect(self.db_path) as conn:
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    status TEXT NOT NULL,
                    upload_time TEXT NOT NULL,
                    processed_time TEXT,
                    file_size INTEGER NOT NULL,
                    content_preview TEXT
                )
            """
            )
            await conn.commit()

    def _document_from_row(self, row: tuple) -> Document:
        """Convert database row to Document object."""
        return Document(
            id=row[0],
            filename=row[1],
            file_path=row[2],
            status=DocumentStatus(row[3]),
            upload_time=datetime.fromisoformat(row[4]),
            processed_time=datetime.fromisoformat(row[5]) if row[5] else None,
            file_size=row[6],
            content_preview=row[7],
        )

    async def _save_document(self, document: Document):
        """Save document to SQLite database."""
        async with aiosqlite.connect(self.db_path) as conn:
            await conn.execute(
                """
                INSERT OR REPLACE INTO documents 
                (id, filename, file_path, status, upload_time, processed_time, file_size, content_preview)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    document.id,
                    document.filename,
                    document.file_path,
                    document.status.value,
                    document.upload_time.isoformat(),
                    (
                        document.processed_time.isoformat()
                        if document.processed_time
                        else None
                    ),
                    document.file_size,
                    document.content_preview,
                ),
            )
            await conn.commit()

    async def get_all_documents(self) -> list[Document]:
        """Get all documents"""
        async with aiosqlite.connect(self.db_path) as conn:
            cursor = await conn.execute(
                "SELECT * FROM documents ORDER BY upload_time DESC"
            )
            rows = await cursor.fetchall()
            return [self._document_from_row(tuple(row)) for row in rows]

    async def get_document(self, document_id: str) -> Optional[Document]:
        """Get a specific document"""
        async with aiosqlite.connect(self.db_path) as conn:
            cursor = await conn.execute(
                "SELECT * FROM documents WHERE id = ?", (document_id,)
            )
            row = await cursor.fetchone()
            return self._document_from_row(tuple(row)) if row else None

    async def delete_document(self, document_id: str) -> bool:
        """Delete a document"""
        document = await self.get_document(document_id)
        if not document:
            return False

        s3_key = document.filename

        try:
            # Delete from S3
            logging.info(f"Deleting file {s3_key} from S3")
            s3_client = S3()
            s3_client.delete_file(s3_key)
        except Exception as e:
            logging.error(f"Error deleting file: {e}")

        # Delete from Qdrant
        try:
            logging.info(f"Deleting document {document_id} from Qdrant")
            qdrant_client = Qdrant()
            qdrant_client.delete_points(document_id)
        except Exception as e:
            logging.error(f"Error deleting from Qdrant: {e}")

        # Remove from SQLite database
        async with aiosqlite.connect(self.db_path) as conn:
            await conn.execute("DELETE FROM documents WHERE id = ?", (document_id,))
            await conn.commit()

        return True

    def extract_full_text(self, pdf_source: str | io.BytesIO) -> str:
        """Extract full text from a PDF file or stream using pdfplumber."""
        all_text = []
        with pdfplumber.open(pdf_source) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                all_text.append(text)
        return "\n".join(all_text)

    def split_by_headings(self, full_text: str) -> list[str]:
        """
        Splits on lines that appear to start with a Roman numeral (I., II., etc.),
        a single letter with period (A., B., etc.), or digits with period (1., 2., etc.)
        """
        # Find all heading positions
        spans: list[tuple[int, int]] = []
        last_end = 0
        for m in HEADING_PATTERN.finditer(full_text):
            start = m.start()
            if start != last_end:
                spans.append((last_end, start))
            last_end = start
        # Append the final span
        spans.append((last_end, len(full_text)))

        # Extract chunks
        chunks = []
        for s, e in spans:
            chunk = full_text[s:e].strip()
            if chunk:
                chunks.append(chunk)
        return chunks

    def tokenize(self, text: str) -> list[int]:
        """Convert a string to a list of token IDs."""
        return ENC.encode(text)

    def detokenize(self, tokens: list[int]) -> str:
        """Convert a list of token IDs back to a string."""
        return ENC.decode(tokens)

    def chunk_by_token_limit(self, sections: list[str], max_tokens: int) -> list[str]:
        """Chunk sections into smaller pieces based on token limit."""
        final_chunks: list[str] = []
        for sec in sections:
            tokens = self.tokenize(sec)
            if len(tokens) <= max_tokens:
                final_chunks.append(sec)
            else:
                # break into consecutive slices of length <= max_tokens,
                # with some overlap (e.g. 50 tokens) to preserve context
                overlap = 50
                start_idx = 0
                while start_idx < len(tokens):
                    end_idx = min(start_idx + max_tokens, len(tokens))
                    slice_tokens = tokens[start_idx:end_idx]
                    final_chunks.append(self.detokenize(slice_tokens))
                    start_idx = end_idx - overlap
                    if start_idx < 0:
                        start_idx = 0
                    if end_idx == len(tokens):
                        break
        return final_chunks

    def embed_chunks(self, chunks: list[str], model: str) -> list[list[float]]:
        """Embed text chunks using OpenAI embeddings API."""
        embeddings = []
        BATCH_SIZE = 16
        for i in range(0, len(chunks), BATCH_SIZE):
            batch = chunks[i : i + BATCH_SIZE]
            response = openai.embeddings.create(input=batch, model=model)

            for entry in response.data:
                embeddings.append(entry.embedding)
        return embeddings

    async def upload_document(self, file: UploadFile) -> Document:
        """Upload a document directly to S3 and return document ID"""
        document_id = str(uuid.uuid4())
        filename = file.filename or "unnamed_file"
        s3_key = filename

        # Read file content
        content = await file.read()

        # Upload to S3
        s3_client = S3()
        s3_url = s3_client.upload_file(
            document_id, file_content=content, filename=s3_key
        )

        document = Document(
            id=document_id,
            filename=filename,
            file_path=s3_url,  # Store S3 URL
            status=DocumentStatus.UPLOADED,
            upload_time=datetime.now(),
            file_size=len(content),
        )

        await self._save_document(document)
        return document

    async def process_document(self, document_id: str) -> None:
        """Process document for RAG pipeline."""
        document = await self.get_document(document_id)
        if not document:
            logging.error(f"Document {document_id} not found")
            return

        document.status = DocumentStatus.PROCESSING
        await self._save_document(document)

        loop = asyncio.get_event_loop()

        # S3 operation in thread pool
        s3_client = S3()
        pdf_content = await loop.run_in_executor(
            None, s3_client.stream_file, document.filename
        )

        # Create a BytesIO stream from the PDF content
        pdf_stream = io.BytesIO(pdf_content)

        try:
            full_text = self.extract_full_text(pdf_stream)

            sections = self.split_by_headings(full_text)
            logging.info(f"Identified {len(sections)} top-level sections.")

            chunks = self.chunk_by_token_limit(sections, MAX_TOKENS_PER_CHUNK)
            logging.info(f"Total chunks after token-splitting: {len(chunks)}")

            # OpenAI embeddings in thread pool
            embeddings = await loop.run_in_executor(
                None, self.embed_chunks, chunks, EMBED_MODEL
            )
            logging.info(
                f"Generated {len(embeddings)} embeddings (each is a vector of floats)."
            )

            # Qdrant operations in thread pool
            qdrant_client = Qdrant()

            points = await loop.run_in_executor(
                None,
                self._process_qdrant_operations,
                qdrant_client,
                document,
                chunks,
                embeddings,
            )
            logging.info(f"Upserted {len(points)} points in Qdrant.")

            # Update status
            document.status = DocumentStatus.PROCESSED
            document.processed_time = datetime.now()

            document.content_preview = chunks[0][:1000]  # Preview first 1000 chars
            if len(chunks) > 1:
                document.content_preview += " ... (more content available)"
            logging.info(
                f"Document {document_id} processed successfully. Preview: {document.content_preview}"
            )
            await self._save_document(document)

        except Exception as e:
            document.status = DocumentStatus.ERROR
            await self._save_document(document)
            logging.error(f"Error processing document {document_id}: {e}")

    def _process_qdrant_operations(
        self,
        qdrant_client: Qdrant,
        document: Document,
        chunks: list[str],
        embeddings: list[list[float]],
    ) -> list[PointStruct]:
        """Helper method to run Qdrant operations synchronously"""
        if not qdrant_client.collection_exists():
            qdrant_client.create_collection()

        return qdrant_client.upsert_points(
            document.id, document.filename, chunks, embeddings
        )

    async def check_duplicate_filename(self, filename: str) -> bool:
        """Check if a document with the given filename already exists"""
        documents = await self.get_all_documents()
        return any(doc.filename == filename for doc in documents)
