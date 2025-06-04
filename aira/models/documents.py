from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    ERROR = "error"


class DocumentResponse(BaseModel):
    document_id: str
    filename: str
    status: DocumentStatus
    message: Optional[str] = None
    upload_time: Optional[datetime] = None


class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    document_ids: Optional[List[str]] = None
    context_length: Optional[int] = Field(default=3, ge=1, le=10)


class QuestionResponse(BaseModel):
    question: str
    answer: str
    confidence_score: Optional[float] = None
    sources: List[Dict[str, Any]] = []
    processing_time: Optional[float] = None
    session_id: Optional[str] = None


class FeedbackRequest(BaseModel):
    session_id: str
    question: str
    answer: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    is_helpful: bool


class Document(BaseModel):
    id: str
    filename: str
    file_path: str
    status: DocumentStatus
    upload_time: datetime
    processed_time: Optional[datetime] = None
    file_size: int
    content_preview: Optional[str] = None


class QAHistory(BaseModel):
    id: str
    question: str
    answer: str
    timestamp: datetime
    document_ids: List[str]
    confidence_score: Optional[float] = None
    feedback_rating: Optional[int] = None


class Chunk(BaseModel):
    chunk_id: str
    file_path: str
    content: List[str]
    tables: Optional[List[Dict[str, Any]]] = None
