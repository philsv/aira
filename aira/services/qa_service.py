import asyncio
import os
import uuid
from asyncio import Semaphore
from datetime import datetime
from typing import Optional

import openai

from ..models.documents import (
    FeedbackRequest,
    QAHistory,
    QuestionResponse,
)
from .qdrant_service import Qdrant

# xAI Client configuration
XAI_API_KEY = os.getenv("XAI_API_KEY")
XAI_MODEL = os.getenv("XAI_MODEL", "grok-3-mini")

client = openai.AsyncOpenAI(
    base_url="https://api.x.ai/v1",
    api_key=XAI_API_KEY,
)


class QAService:
    def __init__(self):
        self.qa_history = {}  # In-memory storage for now
        self.feedback_db = {}  # Store feedback

    @staticmethod
    async def send_request(sem: Semaphore, question: str, search_results: str):
        """Send a single request to xAI with semaphore control."""
        async with sem:
            return await client.chat.completions.create(
                model=XAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that answers questions based on provided documents.",
                    },
                    {
                        "role": "user",
                        "content": f"""
                        Question: {question}
                        Context: {search_results}
                        Please provide a concise answer based on the context.
                        If the context is insufficient, state that you cannot answer.
                        """,
                    },
                ],
            )

    async def process_requests(
        self,
        requests: list[tuple[str, str]],  # List of (question, search_results) tuples
        max_concurrent: int = 2,
    ) -> list:
        """Process multiple requests with controlled concurrency."""
        # Create a semaphore that limits how many requests can run at the same time
        sem = Semaphore(max_concurrent)

        tasks = [
            self.send_request(sem, question, search_results)
            for question, search_results in requests
        ]

        return await asyncio.gather(*tasks)

    async def answer_question(
        self,
        question: str,
        document_ids: Optional[list[str]] = None,
        context_length: int = 5,
    ) -> QuestionResponse:
        """Answer a question based on uploaded documents"""
        start_time = datetime.now()
        session_id = str(uuid.uuid4())

        qdrant_client = Qdrant()
        sources = qdrant_client.search(
            question=question,
            context_length=context_length,
        )

        if not sources:
            raise ValueError("No relevant documents found for the question.")

        # Prepare the context for the LLM
        context = "\n".join(
            [
                f"Document ID: {point.payload['document_id']}, Chunk ID: {point.payload['point_id']}, Text: {point.payload['content']}"
                for point in sources
            ]
        )

        # Use the xAI client to generate an answer
        answer_response = await self.send_request(
            Semaphore(2),  # Limit to 2 concurrent requests
            question=question,
            search_results=context,
        )

        processing_time = (datetime.now() - start_time).total_seconds()

        formatted_sources = [
            {
                "point_id": point.payload.get("point_id", point.id),
                "document_id": point.payload["document_id"],
                "document_name": point.payload["document_filename"],
                "content": point.payload["content"],
                "score": point.score,
            }
            for point in sources
        ]

        answer = answer_response.choices[0].message.content
        confidence_score = sum(point.score for point in sources) / len(
            sources
        )  # Average score

        response = QuestionResponse(
            question=question,
            answer=answer,
            confidence_score=confidence_score,
            sources=formatted_sources,
            processing_time=processing_time,
            session_id=session_id,
        )

        # Gather all unique document IDs
        document_ids = list(set(point.payload["document_id"] for point in sources))

        # Store in history
        qa_record = QAHistory(
            id=session_id,
            question=question,
            answer=answer,
            timestamp=datetime.now(),
            document_ids=document_ids or [],
            confidence_score=confidence_score,
        )
        self.qa_history[session_id] = qa_record

        return response

    async def submit_feedback(self, feedback: FeedbackRequest):
        """Submit feedback for a question-answer pair"""
        self.feedback_db[feedback.session_id] = feedback

        # Update QA history with feedback
        if feedback.session_id in self.qa_history:
            self.qa_history[feedback.session_id].feedback_rating = feedback.rating

    async def get_qa_history(self, limit: int = 10, offset: int = 0) -> list[QAHistory]:
        """Get question-answer history"""
        history_list = list(self.qa_history.values())
        history_list.sort(key=lambda x: x.timestamp, reverse=True)
        return history_list[offset : offset + limit]
