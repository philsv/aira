import io
import os

import boto3  # type: ignore[import-untyped]
from dotenv import load_dotenv

load_dotenv()

# S3 client configuration
S3_BUCKET = os.getenv("S3_BUCKET")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY")
S3_REGION = os.getenv("S3_REGION")


class S3:
    """Client for interacting with S3 for document storage.
    This client handles connection and file upload."""

    def __init__(self):
        self.client = self.setup_s3_client()
        self.bucket_name = os.getenv("S3_BUCKET")

    def setup_s3_client(self) -> boto3.client:
        """Setup S3 client."""
        return boto3.client(
            service_name="s3",
            aws_access_key_id=S3_ACCESS_KEY,
            aws_secret_access_key=S3_SECRET_KEY,
            region_name=S3_REGION,
        )

    def upload_file(
        self,
        document_id: str,
        file_content: bytes,
        filename: str,
        object_name: str | None = None,
    ) -> str:
        """Upload a file to S3 bucket."""

        # If S3 object_name was not specified, use filename
        if object_name is None:
            object_name = os.path.basename(filename)

        file_obj = io.BytesIO(file_content)

        self.client.upload_fileobj(
            file_obj,
            self.bucket_name,
            object_name,
            ExtraArgs={
                "Metadata": {"document_id": document_id},
            },
        )
        presigned_url = self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": object_name},
            ExpiresIn=86400,
        )

        return presigned_url

    def delete_file(self, object_name: str) -> None:
        """Delete a file from S3 bucket."""
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=object_name)
        except Exception as e:
            raise Exception(f"Failed to delete file {object_name} from S3: {str(e)}")

    def stream_file(self, object_name: str) -> bytes:
        """Stream a file from S3 bucket."""
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=object_name)
            return response["Body"].read()
        except Exception as e:
            raise Exception(f"Failed to stream file {object_name} from S3: {str(e)}")

    def file_exists(self, object_name: str) -> bool:
        """Check if a file exists in S3 bucket."""
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=object_name)
            return True
        except self.client.exceptions.ClientError:
            return False
        except Exception as e:
            raise Exception(
                f"Failed to check if file {object_name} exists in S3: {str(e)}"
            )
