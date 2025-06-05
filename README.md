# aira - Agentic Information Retrieval Assistant

Aira is a demo AI-powered document chat application that allows users to interact with documents using natural language.

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) package manager
- Node.js 18+ (for frontend development)
- npm or yarn package manager

### Installation

1. Clone the repository:

```bash
git clone https://github.com/philsv/aira.git
cd aira
```

2. Install dependencies:

```bash
make install
```

3. Deploy the application with a single command:

```bash
make deploy
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
