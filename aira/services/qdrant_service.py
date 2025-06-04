import logging
import os

import openai  # Typ hint

from dotenv import load_dotenv
from qdrant_client import QdrantClient, models
from qdrant_client.models import Distance, PointStruct, VectorParams
from uuid6 import uuid7

os.getenv("QDRANT__TELEMETRY_DISABLED", "true")
load_dotenv()

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(message)s", datefmt="%d-%b-%y %H:%M:%S"
)

# Qdrant client configuration
QDRANT_HOST = os.getenv("QDRANT_HOST", "host.docker.internal")
QDRANT_PORT = os.getenv("QDRANT_PORT", "6333")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-ada-002")
MODEL_DIMENSIONS = os.getenv("MODEL_DIMENSIONS", "1536")

# OpenAI client configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-ada-002")

openai.api_key = OPENAI_API_KEY


class Qdrant:
    """Client for interacting with Qdrant vector database.
    This client handles connection, collection management, and data upload."""

    def __init__(self):
        self.url = f"http://{QDRANT_HOST}:{QDRANT_PORT}"
        self.client = QdrantClient(url=self.url, timeout=10, https=True)

        # Parameters for vector storage
        self.embedding_model_name = EMBED_MODEL
        self.embedding_model_dimensions = int(MODEL_DIMENSIONS)
        self.collection_name = "documents"

    def get_collections(self) -> list:
        """Get list of collections."""
        return self.client.get_collections().collections

    def collection_exists(self) -> bool:
        """Check if the collection exists."""
        collections = self.get_collections()
        return any(
            collection.name == self.collection_name for collection in collections
        )

    def create_collection(self) -> None:
        """Create a new collection if it does not exist."""
        # If collection does not exist, create it
        if self.collection_name not in [
            collection.name for collection in self.get_collections()
        ]:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.embedding_model_dimensions, distance=Distance.COSINE
                ),
                # Scalar Quantization for 2x Search Speed while preserving 99% Accuracy
                quantization_config=models.ScalarQuantization(
                    scalar=models.ScalarQuantizationConfig(
                        type=models.ScalarType.INT8,
                        quantile=0.99,
                        always_ram=True,
                    )
                ),
            )

    def embed(
        self,
        document_id: str,
        document_filename: str,
        embeddings: list,
        chunks: list,
    ) -> list[PointStruct]:
        """Embed texts using OpenAI."""
        points = []
        for idx, data in enumerate(embeddings):
            # Have the same UUID for the set of text
            point_id = uuid7().hex

            # Create points in Qdrant
            point = PointStruct(
                id=point_id,
                vector=data,
                payload={
                    "point_id": point_id,
                    "document_id": document_id,
                    "document_filename": document_filename,
                    "content": chunks[idx],
                },
            )
            points.append(point)

        logging.info(f"Upserted {len(points)} points in Qdrant")
        return points

    def upsert_points(
        self,
        document_id: str,
        document_filename: str,
        chunks: list[str],
        embeddings: list[list[float]],
    ) -> list[PointStruct]:
        """Upsert data in Qdrant."""
        points = self.embed(document_id, document_filename, embeddings, chunks)

        logging.info(
            f"Upserting {document_filename} in vector store: {self.collection_name}"
        )

        if len(points) >= 200:
            list_of_points = [points[i : i + 200] for i in range(0, len(points), 200)]

            for point in list_of_points:
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=point,
                )
        else:
            self.client.upsert(
                collection_name=self.collection_name,
                points=points,
            )
        return points

    def delete_points(self, document_id: str) -> None:
        """Delete points by document ID."""
        logging.info(f"Deleting points for document ID: {document_id}")
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="document_id",
                            match=models.MatchValue(value=document_id),
                        )
                    ]
                )
            ),
        )

    def search(
        self,
        question: str,
        context_length: int = 5,
    ) -> list:
        """Search in Qdrant collection."""
        search_result = self.client.search(
            collection_name=self.collection_name,
            search_params=models.SearchParams(
                quantization=models.QuantizationSearchParams(
                    rescore=True,
                )
            ),
            query_vector=openai.embeddings.create(
                input=[question], model=self.embedding_model_name
            )
            .data[0]
            .embedding,
            limit=context_length,
        )
        return search_result
