.PHONY: help install deploy server clean test requirements

# Default target
help:
	@echo "Available commands:"
	@echo "  install      Install dependencies and build the project"
	@echo "  deploy       Deploy the project using Docker Compose"
	@echo "  server       Run the FastAPI server with uvicorn"
	@echo "  requirements Compile requirements.in to requirements.txt"
	@echo "  clean        Clean cache files"
	@echo "  test         Run tests"

# Install dependencies and builds the project
install:
	uv pip install -r requirements.txt

# Deploy the project using Docker Compose
deploy:
	docker-compose up -d --build

# Run the FastAPI server
server:
	uvicorn aira.api.server:app --host 0.0.0.0 --port 8000 --reload

# Compile requirements
requirements:
	uv pip compile requirements.in -o requirements.txt

# Clean cache files
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	rm -rf .mypy_cache/
	rm -rf .pytest_cache/

# Run tests (add pytest to requirements.in if needed)
test:
	PYTHONPATH=. pytest tests/