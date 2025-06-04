import os

from langsmith import Client  # type: ignore[import-untyped]
from dotenv import load_dotenv

load_dotenv()


def setup_langsmith():
    """Setup LangSmith configuration"""
    os.environ["LANGCHAIN_TRACING"] = "true"
    os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"

    langsmith_api_key = os.getenv("LANGSMITH_API_KEY")
    langsmith_project = os.getenv("LANGSMITH_PROJECT")

    if not langsmith_api_key:
        raise ValueError("LANGSMITH_API_KEY environment variable is required")

    os.environ["LANGCHAIN_API_KEY"] = langsmith_api_key
    os.environ["LANGCHAIN_PROJECT"] = langsmith_project

    client = Client(
        api_key=langsmith_api_key, api_url="https://api.smith.langchain.com"
    )

    return client
