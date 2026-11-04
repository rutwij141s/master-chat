# MasterChat: Production AI Chat Platform

MasterChat is an enterprise-grade, multi-model conversational AI platform featuring real-time token streaming, document-grounded answers (RAG), tool-using LangGraph agents, conversation memory, and a frontend crafted in Apple's **"Liquid Glass"** design language.

---

## Architecture Overview

```mermaid
graph TD
    Client["Client (Browser / Mobile)<br/>Next.js 15 + Liquid Glass UI"]
    
    subgraph Gateway ["API Gateway (Go / Gin)"]
        Auth["JWT Auth (Argon2 / BCrypt)"]
        RateLimit["Rate Limiter (Redis Sliding Window)"]
        SSEProxy["Zero-Buffering SSE Stream Proxy"]
    end

    subgraph AIService ["AI Service (Python 3.12 / FastAPI)"]
        Router["Model Router (OpenAI / Anthropic + Auto Fallback)"]
        Agent["LangGraph Agent Workflow"]
        RAG["RAG Engine (MMR + Cross-Encoder Rerank)"]
        Memory["Sliding Window + Rolling Summary Memory"]
    end

    subgraph Storage ["Persistence & Cache"]
        PG[("PostgreSQL 16<br/>Users, Chats, Messages, Usage")]
        Redis[("Redis 7<br/>Rate Limits, Sessions, Queues")]
        Chroma[("ChromaDB<br/>User Isolated Vector Embeddings")]
    end

    Client -->|HTTPS / REST / SSE| Gateway
    Gateway --> Auth
    Auth --> RateLimit
    RateLimit --> SSEProxy
    SSEProxy -->|Internal HTTP Streaming| AIService

    AIService --> Router
    Router --> Agent
    Agent --> RAG
    Agent --> Memory

    Gateway -->|User Auth Checks| PG
    Gateway -->|Rate Limit Counters| Redis
    AIService -->|Store Chats & Metadata| PG
    AIService -->|Vector Storage & MMR Query| Chroma
    AIService -->|Model Inference| LLMProviders["External LLMs<br/>(OpenAI GPT-4o / Anthropic Claude 3.5)"]
```

---

## Monorepo Layout

```
MasterChat/
├── .env                               # Local active environment configuration
├── docker-compose.yml                 # Multi-container local orchestration
├── Makefile                           # Developer workflow shortcuts
├── README.md                          # Full architectural and deployment documentation
├── .github/
│   └── workflows/
│       └── ci.yml                     # GitHub Actions CI (lint, test, build)
├── infra/
│   ├── docker/
│   │   ├── Dockerfile.gateway         # Multi-stage Alpine Go build
│   │   ├── Dockerfile.ai-service      # Multi-stage Python 3.12 slim build
│   │   └── Dockerfile.frontend        # Multi-stage Node.js 22 standalone build
│   ├── postgres/
│   │   └── init.sql                   # Database initialization script
│   └── prometheus/
│       └── prometheus.yml             # Observability metrics scrape config
├── ai-service/
│   ├── requirements.txt               # Pydantic v2, FastAPI, LangGraph, ChromaDB, etc.
│   ├── alembic.ini                    # Database migrations configuration
│   ├── alembic/                       # Alembic schema versioning
│   │   ├── env.py
│   │   └── versions/001_initial_schema.py
│   ├── app/
│   │   ├── main.py                    # FastAPI application root & lifespans
│   │   ├── config.py                  # Pydantic BaseSettings
│   │   ├── db/                        # SQLAlchemy async models & sessions
│   │   │   ├── models.py
│   │   │   └── session.py
│   │   ├── schemas/                   # Pydantic v2 request/response contracts
│   │   ├── providers/                 # Model provider adapters & failover router
│   │   │   ├── base.py
│   │   │   ├── openai_provider.py
│   │   │   ├── anthropic_provider.py
│   │   │   └── router.py
│   │   ├── rag/                       # Ingestion, chunking, embeddings & reranking
│   │   │   ├── parser.py
│   │   │   ├── chunker.py
│   │   │   ├── embeddings.py
│   │   │   ├── vectorstore.py
│   │   │   └── reranker.py
│   │   ├── agents/                    # LangGraph workflow, tools, and memory
│   │   │   ├── tools.py
│   │   │   ├── state.py
│   │   │   ├── memory.py
│   │   │   └── graph.py
│   │   └── api/v1/                    # REST & SSE streaming routers
│   └── tests/                         # Pytest suite with mock providers
├── gateway-go/
│   ├── go.mod / go.sum
│   ├── cmd/server/main.go             # Gin gateway with graceful shutdown
│   ├── internal/
│   │   ├── config/config.go           # Environment parser
│   │   ├── auth/                      # JWT token manager & bcrypt hashing
│   │   ├── db/postgres.go             # PostgreSQL connection pool & queries
│   │   ├── redis/client.go            # Redis client & sliding window rate limiter
│   │   ├── middleware/                # Auth, RateLimit, CORS, Slog logger, RequestID
│   │   ├── proxy/sse_proxy.go         # Zero-buffering SSE reverse-proxy
│   │   └── handlers/                  # Auth, chat, documents, models, usage handlers
│   └── tests/                         # Table-driven Go tests
└── frontend/
    ├── package.json / tsconfig.json
    ├── tailwind.config.ts             # Apple Liquid Glass design tokens
    ├── src/
    │   ├── app/                       # Next.js 15 App Router pages & globals.css
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   ├── components/
    │   │   ├── ui/                    # GlassCard, GlassButton, GlassModal
    │   │   ├── chat/                  # MessageList, ChatMessage, MessageInput, ModelSelector, Popover
    │   │   ├── sidebar/               # Sidebar, ConversationItem
    │   │   └── documents/             # DocumentManager
    │   └── lib/                       # API client, types, formatters
    └── e2e/                           # Playwright end-to-end smoke test
```

---

## Key Features

### 1. Apple Liquid Glass UI Design
- Layered translucent surfaces with `backdrop-filter: blur(28px) saturate(180%)` and 1px specular inner borders.
- Floating glass message composer with model selector, RAG toggle, and auto-expanding input.
- Markdown rendering with syntax highlighting, copy-code button, tables, and full **LaTeX math (KaTeX)** support.
- Interactive citation chips that open a glass popover with source snippet and page numbers.
- Morphing glass sidebar with chat search, inline rename, delete confirmation, and dark/light mode toggle.
- Vibrantly animated blurred mesh background orbs.

### 2. Go API Gateway
- **JWT Authentication:** Secure user registration, login, and token refresh with bcrypt hashing.
- **Per-User Rate Limiting:** Sliding-window rate limiter backed by Redis.
- **Zero-Buffering SSE Proxy:** Immediate chunk-by-chunk flushing (`c.Writer.Flush()`) from upstream Python AI service to the client.
- **Middleware:** Structured `slog` JSON logging, automatic `X-Request-Id` generation, and CORS protection.

### 3. Multi-Model AI Orchestration & Fallback
- Adapter pattern supporting OpenAI (`gpt-4o`, `gpt-4o-mini`) and Anthropic (`claude-3-5-sonnet`, `claude-3-5-haiku`).
- Automatic fallback failover: If the primary provider experiences a failure or timeout, the request seamlessly routes to the alternative model without crashing.

### 4. Enterprise RAG Pipeline
- Supports ingestion of PDF, DOCX, TXT, MD, and URLs.
- Recursive character splitting (~800 characters with 100 overlap).
- Local embeddings using Hugging Face `BAAI/bge-small-en-v1.5`.
- Per-user metadata isolation in ChromaDB.
- Maximal Marginal Relevance (MMR) retrieval for diverse, non-redundant chunk selection.
- Optional Hugging Face Cross-Encoder reranker (`cross-encoder/ms-marco-MiniLM-L-6-v2`).
- **Prompt Injection Defense:** Strict XML boundary delimitation and sanitization of ingested content before LLM synthesis.

### 5. LangGraph Agent Workflow & Memory
- StateGraph workflow: `router node -> (direct | rag | tool | web search) -> response synthesis -> memory update`.
- Built-in tools: AST safe mathematical calculator, DuckDuckGo search, file Q&A, and sandboxed execution.
- Conversation memory: Sliding window of recent turns + rolling summaries saved to Postgres.
- Automatic conversation title generation after the first exchange.

---

## Environment Variables

Configure your environment variables in `.env`:

| Variable | Description | Default |
|---|---|---|
| `ENVIRONMENT` | Running mode (`development`, `production`) | `development` |
| `FRONTEND_PORT` | Port for Next.js frontend | `3000` |
| `GATEWAY_PORT` | Port for Go API Gateway | `8080` |
| `AI_SERVICE_PORT` | Port for Python AI Service | `8000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://masterchat:masterchat_secure_pass@localhost:5432/masterchat_db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `CHROMA_PERSIST_DIR`| Local path for ChromaDB storage | `./data/chroma` |
| `JWT_SECRET` | Secret key for signing JWT tokens | 32+ character secret |
| `OPENAI_API_KEY` | OpenAI API key | Required for real OpenAI models |
| `ANTHROPIC_API_KEY`| Anthropic API key | Required for real Claude models |
| `OPENAI_MODEL` | Default OpenAI model | `gpt-4o` |
| `ANTHROPIC_MODEL` | Default Anthropic model | `claude-3-5-sonnet-20241022` |
| `DEFAULT_MODEL_PROVIDER`| Primary provider preference | `openai` |
| `EMBEDDING_MODEL` | HuggingFace embedding model | `BAAI/bge-small-en-v1.5` |
| `RATE_LIMIT_PER_MINUTE` | Per-user rate limit limit | `60` |

---

## Quickstart & Local Run

### Option A: Using Docker Compose (Recommended)

1. Ensure Docker is running.
2. Clone the repository and configure your environment:
   ```bash
   # Add your OPENAI_API_KEY and/or ANTHROPIC_API_KEY to .env
   ```
3. Start the entire platform with one command:
   ```bash
   docker-compose up -d --build
   ```
4. Access the services:
   - **Frontend UI:** [http://localhost:3000](http://localhost:3000)
   - **API Gateway:** [http://localhost:8080](http://localhost:8080)
   - **AI Service OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Prometheus Metrics:** [http://localhost:9090](http://localhost:9090)

### Option B: Running Standalone Services Locally

#### 1. Start Go Gateway:
```bash
cd gateway-go
go run cmd/server/main.go
```

#### 2. Start Python AI Service:
```bash
cd ai-service
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Start Next.js Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## REST API Specification

### Authentication
- `POST /auth/register`: Register new account (`email`, `password`, `full_name`)
- `POST /auth/login`: Authenticate and receive `access_token` and `refresh_token`
- `POST /auth/refresh`: Exchange refresh token for new access token

### Conversations & Chat
- `GET /conversations`: Retrieve user conversations
- `POST /conversations`: Create a new conversation session
- `DELETE /conversations/{id}`: Delete conversation and message history
- `GET /conversations/{id}/messages`: Get message history for a conversation
- `POST /chat/stream`: Server-Sent Events (SSE) token stream:
  ```json
  {
    "conversation_id": "optional-uuid",
    "message": "Explain how RAG MMR retrieval works",
    "model": "gpt-4o",
    "use_rag": true,
    "temperature": 0.7
  }
  ```

### Document Ingestion (RAG)
- `POST /documents/upload`: Multipart upload (`file` or `url` form fields)
- `GET /documents`: List user's indexed documents with chunk counts and statuses
- `DELETE /documents/{id}`: Purge document and remove vector chunks from ChromaDB

### Metadata & Observability
- `GET /models`: List available models and capabilities
- `GET /usage`: View user token and cost consumption
- `GET /health`: Gateway and AI service liveness
- `GET /ready`: Database, Redis, and Vector store readiness check

---

## Running Tests

### Go Gateway Tests
Run unit and table-driven HTTP handler tests:
```bash
cd gateway-go
go test -v ./tests/...
```

### Python AI Service Tests
Run pytest unit and integration tests with mocked providers:
```bash
cd ai-service
pytest -v
```

### Frontend E2E Smoke Tests
Run Playwright browser automation tests:
```bash
cd frontend
npx playwright test
```

---

## Production Deployment Guide

### 1. Database Migrations
When deploying to production, apply Alembic database migrations:
```bash
cd ai-service
alembic upgrade head
```

### 2. Docker Container Builds
Production containers are multi-stage and stripped of build-time dependencies:
```bash
# Build Go Gateway (Alpine static binary, ~18MB)
docker build -t masterchat/gateway:latest -f infra/docker/Dockerfile.gateway ./gateway-go

# Build AI Service (Python slim runner, ~220MB)
docker build -t masterchat/ai-service:latest -f infra/docker/Dockerfile.ai-service ./ai-service

# Build Frontend (Next.js standalone output)
docker build -t masterchat/frontend:latest -f infra/docker/Dockerfile.frontend ./frontend
```

### 3. Security Checklist for Production
- [x] Configure HTTPS and TLS certificates for the Go API Gateway.
- [x] Rotate `JWT_SECRET` to a cryptographically secure random 64-character string.
- [x] Enable firewall isolation preventing public traffic from directly hitting PostgreSQL (5432), Redis (6379), or the AI Service (8000) — all external access must route strictly through the Go Gateway.
- [x] Configure Prometheus alerts for HTTP 429 (rate limiting) and 5xx errors.
- [x] Maintain separate ChromaDB collections per tenant/user for strict data privacy.

