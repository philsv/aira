import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from ..models.documents import (
    DocumentResponse,
    DocumentStatus,
    FeedbackRequest,
    QuestionRequest,
    QuestionResponse,
)
from ..services import DocumentService, QAService
from ..services.langsmith_setup import setup_langsmith

# Network configuration
UVICORN_HOST = os.getenv("UVICORN_HOST", "0.0.0.0")
UVICORN_PORT = int(os.getenv("UVICORN_PORT", "8000"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await document_service._init_database()
    # Load existing documents into memory
    document_service.documents_db = {
        doc.id: doc for doc in await document_service.get_all_documents()
    }
    # Initialize LangSmith if configured
    if os.getenv("LANGSMITH_API_KEY"):
        setup_langsmith()
        logger.info("LangSmith initialized successfully")
    yield
    # Shutdown (if needed)


# Initialize FastAPI app
app = FastAPI(
    title="AIRA - Agentic Information Retrieval Assistant",
    description="API for document upload, question answering, and feedback collection",
    version="0.1.0",
    lifespan=lifespan,
    servers=[
        {
            "url": f"http://localhost:{UVICORN_PORT}",
            "description": "Development server",
        },
    ],
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
document_service = DocumentService()
qa_service = QAService()

# Initialize logger
logger = logging.getLogger(__name__)


@app.get(
    "/",
    response_model=dict,
    name="Health Check",
    description="Health check endpoint to verify if the API is running",
    responses={
        200: {"description": "API is running successfully"},
    },
    tags=["Health"],
)
async def health_check():
    """
    Health check endpoint that returns the API status and basic information.

    Returns:
        dict: A dictionary containing status information about the API
    """
    return {
        "status": "healthy",
        "message": "Aira API is running successfully",
        "api_name": "Agentic Information Retrieval Assistant",
        "version": "0.1.0",
    }


@app.post(
    "/documents/upload",
    response_model=DocumentResponse,
    name="Upload Document",
    description="Upload a document for processing",
    responses={
        400: {"description": "Invalid file type"},
        409: {"description": "Document with the same filename already exists"},
        500: {"description": "Internal server error"},
    },
    tags=["Documents"],
)
async def upload_document(
    background_tasks: BackgroundTasks, file: UploadFile = File(...)
):
    """Upload and process a document"""
    try:
        # Validate file type
        if not file.filename or not file.filename.lower().endswith((".pdf")):
            raise HTTPException(
                status_code=400, detail="Only PDF documents are supported"
            )

        # Check for duplicate filename
        if await document_service.check_duplicate_filename(file.filename):
            raise HTTPException(
                status_code=409,
                detail=f"Document with filename '{file.filename}' already exists",
            )

        # Process document in background
        document = await document_service.upload_document(file)

        # Add logging for background task
        logger.info(f"Starting background processing for document {document.id}")

        # Create a wrapper function for better error handling
        async def process_document_with_error_handling(doc_id: str):
            try:
                await document_service.process_document(doc_id)
                logger.info(f"Document {doc_id} processed successfully")
            except Exception as e:
                logger.error(
                    f"Error processing document {doc_id}: {str(e)}", exc_info=True
                )
                # Update document status to ERROR in case of failure
                try:
                    document = await document_service.get_document(doc_id)
                    if document:
                        document.status = DocumentStatus.ERROR
                        # Save the updated status if your service has a method for it
                except Exception as update_error:
                    logger.error(f"Failed to update document status: {update_error}")

        background_tasks.add_task(
            process_document_with_error_handling,
            document.id,
        )

        return DocumentResponse(
            document_id=document.id,
            filename=file.filename,
            status=DocumentStatus.UPLOADED,
            message="Document uploaded successfully and is being processed",
            upload_time=document.upload_time,
        )
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/documents/upload-sync",
    response_model=DocumentResponse,
    name="Upload Document Sync",
    description="Upload and process a document synchronously for debugging",
    responses={
        400: {"description": "Invalid file type"},
        409: {"description": "Document with the same filename already exists"},
        500: {"description": "Internal server error"},
    },
    tags=["Documents"],
)
async def upload_document_sync(file: UploadFile = File(...)):
    """Upload and process a document synchronously for debugging"""
    try:
        # Validate file type
        if not file.filename or not file.filename.lower().endswith((".pdf")):
            raise HTTPException(
                status_code=400, detail="Only PDF documents are supported"
            )

        # Check for duplicate filename
        if await document_service.check_duplicate_filename(file.filename):
            raise HTTPException(
                status_code=409,
                detail=f"Document with filename '{file.filename}' already exists",
            )

        document = await document_service.upload_document(file)
        logger.info(f"Document uploaded: {document.id}")

        # Process synchronously to see any errors
        await document_service.process_document(document.id)
        logger.info(f"Document processed: {document.id}")

        return {"document_id": document.id, "status": "completed"}
    except Exception as e:
        logger.error(f"Sync processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/documents",
    response_model=dict,
    name="List Documents",
    description="List all uploaded documents",
    responses={
        500: {"description": "Internal server error"},
    },
    tags=["Documents"],
)
async def list_documents():
    """List all uploaded documents"""
    try:
        documents = await document_service.get_all_documents()
        return {"documents": documents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/documents/{document_id}/status",
    response_model=dict,
    name="Get Document Status",
    description="Get the processing status of a specific document",
    responses={
        404: {"description": "Document not found"},
        500: {"description": "Internal server error"},
    },
    tags=["Documents"],
)
async def get_document_status(document_id: str):
    """Get the processing status of a document"""
    try:
        document = await document_service.get_document(document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        return {
            "document_id": document_id,
            "status": document.status,
            "filename": document.filename,
            "upload_time": document.upload_time,
            "processed_time": getattr(document, "processed_time", None),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete(
    "/documents/{document_id}",
    response_model=dict,
    name="Delete Document",
    description="Delete a specific document",
    responses={
        404: {"description": "Document not found"},
        500: {"description": "Internal server error"},
    },
    tags=["Documents"],
)
async def delete_document(document_id: str):
    """Delete a document"""
    try:
        success = await document_service.delete_document(document_id)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"message": "Document deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/qa/ask",
    response_model=QuestionResponse,
    name="Ask Question",
    description="Ask a question to an AI model based on uploaded documents",
    responses={
        400: {"description": "Invalid question format"},
        500: {"description": "Internal server error"},
    },
    tags=["Question Answering"],
)
async def ask_question(request: QuestionRequest):
    """Ask a question and get an answer based on uploaded documents"""
    try:
        response = await qa_service.answer_question(question=request.question)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/qa/history",
    response_model=dict,
    name="Get QA History",
    description="Get the history of question-answer pairs",
    responses={
        500: {"description": "Internal server error"},
    },
    tags=["Question Answering"],
)
async def get_qa_history(limit: int = 10, offset: int = 0):
    """Get question-answer history"""
    try:
        history = await qa_service.get_qa_history(limit=limit, offset=offset)
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/feedback",
    response_model=dict,
    name="Submit Feedback",
    description="Submit feedback for a question-answer pair",
    responses={
        400: {"description": "Invalid feedback format"},
        500: {"description": "Internal server error"},
    },
    tags=["Feedback"],
)
async def submit_feedback(feedback: FeedbackRequest):
    """Submit feedback for a question-answer pair"""
    try:
        await qa_service.submit_feedback(feedback)
        return {"message": "Feedback submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/feedback",
    response_model=dict,
    name="Get Feedback History",
    description="Get the history of feedback submissions",
    responses={
        500: {"description": "Internal server error"},
    },
    tags=["Feedback"],
)
async def get_feedback(limit: int = 10, offset: int = 0):
    """Get feedback history"""
    try:
        feedback_history = await qa_service.get_feedback_history(
            limit=limit, offset=offset
        )
        return {"feedback": feedback_history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete(
    "/feedback/{session_id}",
    response_model=dict,
    name="Delete Feedback",
    description="Delete feedback for a specific session",
    responses={
        404: {"description": "Feedback not found"},
        500: {"description": "Internal server error"},
    },
    tags=["Feedback"],
)
async def delete_feedback(session_id: str):
    """Delete feedback for a specific session"""
    try:
        success = await qa_service.delete_feedback(session_id)
        if not success:
            raise HTTPException(status_code=404, detail="Feedback not found")
        return {"message": "Feedback deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host=UVICORN_HOST, port=int(UVICORN_PORT))
