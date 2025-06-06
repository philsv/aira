from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    ERROR = "error"


class Document(BaseModel):
    id: str
    filename: str
    file_path: str
    status: DocumentStatus
    upload_time: datetime
    processed_time: Optional[datetime] = None
    file_size: int
    content_preview: Optional[str] = None


class DocumentResponse(BaseModel):
    document_id: str
    filename: str
    status: DocumentStatus
    message: Optional[str] = None
    upload_time: Optional[datetime] = None


class Chunk(BaseModel):
    chunk_id: str
    file_path: str
    content: List[str]
    tables: Optional[List[Dict[str, Any]]] = None
