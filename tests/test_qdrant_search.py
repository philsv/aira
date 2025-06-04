from unittest.mock import Mock, patch

import pytest
from aira.services.qdrant_service import Qdrant


class TestQdrantSearch:
    """Test suite for Qdrant search functionality"""

    @pytest.fixture
    def qdrant_service(self):
        """Create a Qdrant instance for testing"""
        with patch("qdrant_client.QdrantClient") as _:
            service = Qdrant()
            service.client = Mock()
            return service

    @pytest.fixture
    def mock_search_results(self):
        """Mock search results from Qdrant"""
        return [
            Mock(
                id="point_1",
                score=0.95,
                payload={
                    "document_id": "doc_1",
                    "document_filename": "test_doc.pdf",
                    "content": "This is the first relevant chunk of text.",
                    "point_id": "point_1",
                },
            ),
            Mock(
                id="point_2",
                score=0.88,
                payload={
                    "document_id": "doc_2",
                    "document_filename": "another_doc.pdf",
                    "content": "This is another relevant piece of content.",
                    "point_id": "point_2",
                },
            ),
        ]

    @pytest.fixture
    def mock_embedding(self):
        """Mock OpenAI embedding response"""
        mock_response = Mock()
        mock_response.data = [Mock()]
        mock_response.data[0].embedding = [0.1] * 1536
        return mock_response

    @patch("openai.embeddings.create")
    def test_search_integration(self, mock_openai_embed, qdrant_service):
        """Integration test for the search functionality"""
        # Mock OpenAI embedding response
        mock_response = mock_openai_embed.return_value
        mock_response.data = [type("obj", (object,), {"embedding": [0.1] * 1536})()]

        # Mock Qdrant search results
        mock_search_result = type(
            "obj",
            (object,),
            {
                "id": "point_1",
                "score": 0.95,
                "payload": {
                    "document_id": "doc_1",
                    "document_filename": "test_doc.pdf",
                    "content": "This is a test document content.",
                    "point_id": "point_1",
                },
            },
        )()

        qdrant_service.client.search.return_value = [mock_search_result]

        # Execute the actual search function
        question = "What is the main topic?"
        result = qdrant_service.search(question, context_length=3)

        # Verify the search was called and returned expected results
        assert len(result) == 1
        assert result[0].id == "point_1"
        assert result[0].score == 0.95
        assert result[0].payload["content"] == "This is a test document content."

        # Verify OpenAI was called
        mock_openai_embed.assert_called_once()

        # Verify Qdrant search was called
        qdrant_service.client.search.assert_called_once()
