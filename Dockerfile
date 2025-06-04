FROM python:3.13.3-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-dev \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

WORKDIR /app

COPY requirements.txt /app/requirements.txt

# Create virtual environment and install dependencies
RUN uv venv .venv
RUN uv pip install --python .venv/bin/python -r requirements.txt

# Copy the current directory contents into the container at /app
COPY /aira /app/aira

# Set default environment variables (can be overridden by .env file)
ENV UVICORN_HOST=0.0.0.0
ENV UVICORN_PORT=8000

EXPOSE ${UVICORN_PORT}

CMD ["sh", "-c", ".venv/bin/python -m uvicorn aira.api.server:app --host ${UVICORN_HOST} --port ${UVICORN_PORT}"]
