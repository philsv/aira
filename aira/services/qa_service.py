import asyncio
import os
import uuid
import aiosqlite
from asyncio import Semaphore
from datetime import datetime
from typing import Optional

import openai
from langsmith.wrappers import wrap_openai
from langsmith import traceable

from ..models.documents import (
    FeedbackRequest,
    FeedbackHistory,
    QAHistory,
    QuestionResponse,
)
from .qdrant_service import Qdrant

# xAI Client configuration
XAI_API_KEY = os.getenv("XAI_API_KEY")
XAI_MODEL = os.getenv("XAI_MODEL", "grok-3-mini")

# Wrap the async OpenAI client for LangSmith tracing
client = wrap_openai(
    openai.AsyncOpenAI(
        base_url="https://api.x.ai/v1",
        api_key=XAI_API_KEY,
    )
)


class QAService:
    def __init__(self, db_path: str = "data/qa.db"):
        self.db_path = db_path
        # Initialize database on startup
        asyncio.create_task(self._init_database())

    async def _init_database(self):
        """Initialize SQLite database with QA history and feedback tables."""
        async with aiosqlite.connect(self.db_path) as conn:
            # Create QA history table
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS qa_history (
                    id TEXT PRIMARY KEY,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    document_ids TEXT NOT NULL,
                    confidence_score REAL,
                    feedback_rating INTEGER,
                    processing_time REAL
                )
            """
            )

            # Create feedback table
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    rating INTEGER NOT NULL,
                    comment TEXT,
                    timestamp TEXT NOT NULL,
                    is_helpful BOOLEAN NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES qa_history (id)
                )
            """
            )
            await conn.commit()

    async def _save_qa_record(self, qa_record: QAHistory):
        """Save QA record to SQLite database."""
        async with aiosqlite.connect(self.db_path) as conn:
            await conn.execute(
                """
                INSERT OR REPLACE INTO qa_history 
                (id, question, answer, timestamp, document_ids, confidence_score, feedback_rating, processing_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    qa_record.id,
                    qa_record.question,
                    qa_record.answer,
                    qa_record.timestamp.isoformat(),
                    ",".join(qa_record.document_ids),  # Store as comma-separated string
                    qa_record.confidence_score,
                    qa_record.feedback_rating,
                    None,  # processing_time will be added separately if needed
                ),
            )
            await conn.commit()

    async def _save_feedback(self, feedback: FeedbackRequest):
        """Save feedback to SQLite database."""
        async with aiosqlite.connect(self.db_path) as conn:
            await conn.execute(
                """
                INSERT INTO feedback 
                (session_id, question, answer, rating, comment, is_helpful, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    feedback.session_id,
                    feedback.question,
                    feedback.answer,
                    feedback.rating,
                    feedback.comment,
                    feedback.is_helpful,
                    datetime.now().isoformat(),
                ),
            )
            await conn.commit()

    def _qa_history_from_row(self, row: tuple) -> QAHistory:
        """Convert database row to QAHistory object."""
        return QAHistory(
            id=row[0],
            question=row[1],
            answer=row[2],
            timestamp=datetime.fromisoformat(row[3]),
            document_ids=row[4].split(",") if row[4] else [],
            confidence_score=row[5],
            feedback_rating=row[6],
        )

    @staticmethod
    @traceable(name="send_request_to_xai")
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
                # Add metadata for LangSmith tracking
                extra_body={
                    "metadata": {
                        "question": question,
                        "context_length": len(search_results),
                    }
                },
            )

    @traceable(name="process_multiple_requests")
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

    @traceable(name="answer_question_pipeline")
    async def answer_question(
        self,
        question: str,
        document_ids: Optional[list[str]] = None,
        context_length: int = 5,
    ) -> QuestionResponse:
        """Answer a question based on uploaded documents"""
        start_time = datetime.now()
        session_id = str(uuid.uuid4())

        # Add metadata for tracing
        from langsmith import get_current_run_tree

        run = get_current_run_tree()
        if run:
            run.inputs = {
                "question": question,
                "document_ids": document_ids,
                "context_length": context_length,
                "session_id": session_id,
            }

        qdrant_client = Qdrant()
        sources = qdrant_client.search(
            question=question,
            context_length=context_length,
        )

        if not sources:
            if run:
                run.outputs = {"error": "No relevant documents found"}
            raise ValueError("No relevant documents found for the question.")

        # Prepare the context for the LLM
        context = "\n".join(
            [
                f"Document ID: {point.payload['document_id']}, Chunk ID: {point.payload['point_id']}, Text: {point.payload['content']}"
                for point in sources
            ]
        )

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

        qa_record = QAHistory(
            id=session_id,
            question=question,
            answer=answer,
            timestamp=datetime.now(),
            document_ids=document_ids or [],
            confidence_score=confidence_score,
        )
        await self._save_qa_record(qa_record)

        # Add final outputs to trace
        if run:
            run.outputs = {
                "answer": answer,
                "confidence_score": confidence_score,
                "processing_time": processing_time,
                "sources_count": len(formatted_sources),
                "session_id": session_id,
            }

        return response

    async def get_qa_history(self, limit: int = 10, offset: int = 0) -> list[QAHistory]:
        """Get question-answer history from database"""
        async with aiosqlite.connect(self.db_path) as conn:
            cursor = await conn.execute(
                """
                SELECT id, question, answer, timestamp, document_ids, confidence_score, feedback_rating
                FROM qa_history 
                ORDER BY timestamp DESC 
                LIMIT ? OFFSET ?
            """,
                (limit, offset),
            )
            rows = await cursor.fetchall()
            return [self._qa_history_from_row(tuple(row)) for row in rows]

    @traceable(name="submit_feedback")
    async def submit_feedback(self, feedback: FeedbackRequest):
        """Submit feedback for a question-answer pair"""
        await self._save_feedback(feedback)

        # Update QA history with feedback rating
        async with aiosqlite.connect(self.db_path) as conn:
            await conn.execute(
                """
                UPDATE qa_history 
                SET feedback_rating = ? 
                WHERE id = ?
            """,
                (feedback.rating, feedback.session_id),
            )
            await conn.commit()

    async def get_feedback_history(
        self, limit: int = 10, offset: int = 0
    ) -> list[FeedbackHistory]:
        """Get feedback history from database"""
        async with aiosqlite.connect(self.db_path) as conn:
            cursor = await conn.execute(
                """
                SELECT session_id, question, answer, rating, comment, is_helpful, timestamp
                FROM feedback 
                ORDER BY timestamp DESC 
                LIMIT ? OFFSET ?
            """,
                (limit, offset),
            )
            rows = await cursor.fetchall()
            return [
                FeedbackHistory(
                    session_id=row[0],
                    question=row[1],
                    answer=row[2],
                    rating=row[3],
                    comment=row[4],
                    is_helpful=row[5],
                    timestamp=datetime.fromisoformat(row[6]),
                )
                for row in rows
            ]

    async def delete_feedback(self, session_id: str):
        """Delete feedback for a specific session ID"""
        async with aiosqlite.connect(self.db_path) as conn:
            cursor = await conn.execute(
                """
                DELETE FROM feedback 
                WHERE session_id = ?
            """,
                (session_id,),
            )
            await conn.commit()
            return cursor.rowcount > 0
