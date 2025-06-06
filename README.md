# aira - Agentic Information Retrieval Assistant

Aira is a demo AI-powered document chat application that allows users to interact with documents using natural language.

## Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) package manager
- Node.js 18+ (for frontend development)
- npm or yarn package manager
- Docker or Docker Desktop (Windows users)

## 🚀 Quick Start

### 1. Clone the repository:

```bash
git clone https://github.com/philsv/aira.git
cd aira
```

### 2. Install dependencies:

```bash
make install
```

### 3. Environment Configuration

Copy the environment template and configure your services:

```bash
cp .env.template .env
```

Edit the `.env` file with your service configurations:

#### Required Environment Variables

**OpenAI Configuration** (for embeddings):

```bash
OPENAI_API_KEY=your_openai_api_key_here
EMBED_MODEL=text-embedding-ada-002
MODEL_DIMENSIONS=1536
```

**xAI Configuration** (for chat completions):

```bash
XAI_API_KEY=your_xai_api_key_here
XAI_MODEL=grok-3-mini
```

**Qdrant Vector Database**:

```bash
QDRANT_HOST=host.docker.internal
QDRANT_PORT=6333
```

**AWS S3 Storage**:

```bash
S3_BUCKET=your_s3_bucket_name
S3_ACCESS_KEY=your_s3_access_key
S3_SECRET_KEY=your_s3_secret_key
S3_REGION=your_s3_region
```

**LangSmith Tracing** (optional):

```bash
LANGSMITH_API_KEY=your_langsmith_api_key
LANGSMITH_PROJECT=aira-project
```

**Server Configuration**:

```bash
UVICORN_HOST=0.0.0.0
UVICORN_PORT=8000
```

### 4. Deploy the application in docker:

Ensure Docker is running, then build and start the application:

```bash
make deploy
```

### Dependency Management

This project uses `uv` for fast Python package management. Dependencies are defined in [requirements.in](requirements.in).

To update dependencies:

```bash
make requirements
```

## 🛠️ Development

Start the backend server locally:

```bash
make server
```

### Testing

Run the test suite:

```bash
make test
```

## Accessing the Application

The API will be available at:

- **API Server**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

To access the chat, run:

- **Frontend App**: http://localhost:3000

To access the qdrant dashboard, run:

- **Qdrant Dashboard**: http://localhost:6333/dashboard

To access the fumadocs documentation, run:

- **Documentations**: http://localhost:3007
