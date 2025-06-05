# aira - Agentic Information Retrieval API

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) package manager
- Node.js 18+ (for frontend development)
- npm or yarn package manager

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd aira
```

2. Install dependencies and deploys the application to docker:

```bash
make install
```

## 🛠️ Development

Start the development server:

```bash
make server
```

The API will be available at:

- **Server**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Testing

Run the test suite:

```bash
make test
```

### Dependency Management

This project uses `uv` for fast Python package management. Dependencies are defined in [requirements.in](requirements.in).

To update dependencies:

```bash
make requirements
```

## 🐳 Docker Support

The project includes Docker support via [docker-compose.yaml](docker-compose.yaml).
