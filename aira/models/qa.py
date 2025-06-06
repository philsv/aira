from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)


class QuestionResponse(BaseModel):
    question: str
    answer: str
    confidence_score: Optional[float] = None
    sources: List[Dict[str, Any]] = []
    processing_time: Optional[float] = None
    session_id: Optional[str] = None


class QAHistory(BaseModel):
    id: str
    question: str
    answer: str
    timestamp: datetime
    document_ids: List[str]
    confidence_score: Optional[float] = None
    feedback_rating: Optional[int] = None


class FeedbackRequest(BaseModel):
    session_id: str
    question: str
    answer: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    is_helpful: bool


class FeedbackHistory(BaseModel):
    session_id: str
    question: str
    answer: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    is_helpful: bool
    timestamp: datetime
