import os
import pytest
from unittest.mock import Mock, patch
from fastapi import UploadFile
from io import BytesIO

from aira.services.document_service import DocumentService
from aira.models.documents import Document, DocumentStatus


@pytest.mark.asyncio
class TestDocumentProcessing:
    """Test suite for document processing functionality"""

    @pytest.fixture
    def document_service(self):
        """Create a DocumentService instance for testing"""
        return DocumentService()

    @pytest.fixture
    def mock_pdf_content(self):
        """Mock PDF content for testing"""
        return b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"

    @pytest.mark.parametrize(
        "filename,expected_processing",
        [
            ("valid_document.pdf", True),  # Should pass validation
            ("test_document.pdf", True),
            ("invalid_file.txt", False),  # Should fail validation
        ],
    )
    async def test_document_upload_and_processing(
        self, document_service, mock_pdf_content, filename, expected_processing
    ):
        """Test document upload and processing with different file types"""

        if not expected_processing:
            # Test invalid file type - should be handled by API validation
            pytest.skip("Invalid file types are handled by API validation")

        # Create mock UploadFile
        file_content = BytesIO(mock_pdf_content)
        upload_file = UploadFile(
            filename=filename, file=file_content, content_type="application/pdf"
        )

        # Mock S3 upload
        with patch("aira.services.document_service.S3") as mock_s3_class:
            mock_s3_instance = Mock()
            mock_s3_instance.upload_file.return_value = (
                f"https://s3.amazonaws.com/bucket/documents/test_{filename}"
            )
            mock_s3_class.return_value = mock_s3_instance

            # Test document upload
            document = await document_service.upload_document(upload_file)

            # Verify document creation
            assert document.filename == filename
            assert document.status == DocumentStatus.UPLOADED
            assert document.id in document_service.documents_db
            assert document.file_size == len(mock_pdf_content)

            # Mock the PDF processing dependencies
            with patch.object(
                document_service, "extract_full_text"
            ) as mock_extract, patch.object(
                document_service, "embed_chunks"
            ) as mock_embed, patch(
                "aira.services.document_service.Qdrant"
            ) as mock_qdrant_class:

                # Setup mocks
                mock_extract.return_value = self._get_sample_pdf_text()
                mock_embed.return_value = self._get_sample_embeddings()

                mock_qdrant_instance = Mock()
                mock_qdrant_instance.collection_exists.return_value = False
                mock_qdrant_instance.create_collection.return_value = True
                mock_qdrant_instance.upsert_points.return_value = [{"id": 1}, {"id": 2}]
                mock_qdrant_class.return_value = mock_qdrant_instance

                # Test document processing
                await document_service.process_document(document.id)

                # Verify processing results
                processed_doc = document_service.documents_db[document.id]
                assert processed_doc.status == DocumentStatus.PROCESSED
                assert processed_doc.processed_time is not None

                # Verify method calls
                mock_extract.assert_called_once()
                mock_embed.assert_called_once()
                mock_qdrant_instance.create_collection.assert_called_once()
                mock_qdrant_instance.upsert_points.assert_called_once()

    @pytest.mark.parametrize(
        "document_id,should_exist",
        [
            ("valid-document-id", True),
            ("non-existent-id", False),
        ],
    )
    async def test_get_document(self, document_service, document_id, should_exist):
        """Test document retrieval by ID"""

        if should_exist:
            # Create a test document
            test_doc = Document(
                id=document_id,
                filename="test.pdf",
                file_path="/path/to/test.pdf",
                status=DocumentStatus.UPLOADED,
                file_size=1024,
            )
            document_service.documents_db[document_id] = test_doc

        # Test retrieval
        result = await document_service.get_document(document_id)

        if should_exist:
            assert result is not None
            assert result.id == document_id
            assert result.filename == "test.pdf"
        else:
            assert result is None

    async def test_get_all_documents(self, document_service):
        """Test retrieving all documents"""

        # Create test documents
        doc1 = Document(
            id="doc1",
            filename="test1.pdf",
            file_path="/path1",
            status=DocumentStatus.UPLOADED,
            file_size=100,
        )
        doc2 = Document(
            id="doc2",
            filename="test2.pdf",
            file_path="/path2",
            status=DocumentStatus.PROCESSED,
            file_size=200,
        )

        document_service.documents_db["doc1"] = doc1
        document_service.documents_db["doc2"] = doc2

        # Test retrieval
        all_docs = await document_service.get_all_documents()

        assert len(all_docs) == 2
        assert doc1 in all_docs
        assert doc2 in all_docs

    async def test_document_processing_error_handling(self, document_service):
        """Test error handling during document processing"""

        # Create a test document
        doc_id = "error-test-doc"
        test_doc = Document(
            id=doc_id,
            filename="error_test.pdf",
            file_path="/invalid/path.pdf",
            status=DocumentStatus.UPLOADED,
            file_size=1024,
        )
        document_service.documents_db[doc_id] = test_doc

        # Mock extract_full_text to raise an exception
        with patch.object(
            document_service,
            "extract_full_text",
            side_effect=Exception("PDF parsing error"),
        ):

            # Process document (should handle error gracefully)
            await document_service.process_document(doc_id)

            # Verify error status
            processed_doc = document_service.documents_db[doc_id]
            assert processed_doc.status == DocumentStatus.ERROR

    async def test_delete_document(self, document_service):
        """Test document deletion"""

        # Create a test document
        doc_id = "delete-test-doc"
        test_doc = Document(
            id=doc_id,
            filename="delete_test.pdf",
            file_path="https://s3.amazonaws.com/bucket/test.pdf",
            status=DocumentStatus.PROCESSED,
            file_size=1024,
        )
        document_service.documents_db[doc_id] = test_doc

        # Mock S3 deletion
        with patch("aira.services.document_service.S3") as mock_s3_class:
            mock_s3_instance = Mock()
            mock_s3_instance.delete_file.return_value = True
            mock_s3_class.return_value = mock_s3_instance

            # Test deletion
            result = await document_service.delete_document(doc_id)

            assert result is True
            assert doc_id not in document_service.documents_db
            mock_s3_instance.delete_file.assert_called_once()

    async def test_delete_non_existent_document(self, document_service):
        """Test deletion of non-existent document"""

        result = await document_service.delete_document("non-existent-id")
        assert result is False

    def test_text_processing_methods(self, document_service):
        """Test text processing utility methods"""

        # Test tokenization
        test_text = "This is a test sentence."
        tokens = document_service.tokenize(test_text)
        assert isinstance(tokens, list)
        assert len(tokens) > 0

        # Test detokenization
        detokenized = document_service.detokenize(tokens)
        assert isinstance(detokenized, str)
        assert (
            test_text in detokenized or detokenized in test_text
        )  # Allow for minor differences

        # Test heading splitting
        sample_text = """I. Introduction
        This is the introduction.
        
        II. Main Content
        This is the main content.
        
        A. Subsection
        This is a subsection."""

        sections = document_service.split_by_headings(sample_text)
        assert len(sections) >= 2  # Should split on headings

    def test_chunk_by_token_limit(self, document_service):
        """Test chunking by token limit"""

        # Create a long text that exceeds token limit
        long_sections = [
            "This is a very long section. " * 200
        ]  # Repeat to make it long

        chunks = document_service.chunk_by_token_limit(long_sections, max_tokens=100)

        # Verify chunking
        assert len(chunks) > 1  # Should be split into multiple chunks
        for chunk in chunks:
            tokens = document_service.tokenize(chunk)
            assert len(tokens) <= 100  # Each chunk should respect token limit

    def _get_sample_pdf_text(self):
        """Helper method to provide sample PDF text for testing"""
        return """I. Executive Summary
        This document contains important information about BMF regulations from December 6, 2017.
        
        II. Main Provisions
        The main provisions include various regulatory updates and compliance requirements.
        
        III. Implementation Guidelines
        These guidelines provide detailed instructions for implementation."""

    def _get_sample_embeddings(self):
        """Helper method to provide sample embeddings for testing"""
        # Return mock embeddings (normally 1536 dimensions for ada-002)
        return [
            [0.1] * 1536,  # Mock embedding vector
            [0.2] * 1536,  # Mock embedding vector
            [0.3] * 1536,  # Mock embedding vector
        ]


# Integration test that can be run with actual services (optional)
@pytest.mark.integration
class TestDocumentProcessingIntegration:
    """Integration tests that require actual services"""

    @pytest.mark.skipif(
        not os.getenv("OPENAI_API_KEY"), reason="OpenAI API key not available"
    )
    @pytest.mark.parametrize(
        "document_id", ["c6bc7200-6958-4ceb-b1a7-e92108eab93e"]  # Example document ID
    )
    def test_real_pdf_processing(self, document_id):
        """Test with real PDF processing (requires actual services)"""
        DocumentService().process_document(document_id)
