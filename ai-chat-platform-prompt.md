# Production AI Chat Platform: Master Build Prompt

> Paste this file into Claude Code, Cursor, or any coding agent. It is designed to be built in phases. Verify each phase runs before starting the next.

---

## ROLE

You are a senior full-stack AI engineer and product designer. Build a production-grade, ChatGPT/Claude-style AI chat platform. Work in phases, verify each phase runs before starting the next, and never hardcode secrets.

## OBJECTIVE

A multi-model conversational AI app with streaming chat, document-grounded answers (RAG), tool-using agents, conversation memory, and a frontend built in Apple's "Liquid Glass" design language.

---

## ARCHITECTURE

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind + Framer Motion |
| API Gateway | Go (Gin or Fiber): auth, rate limiting, SSE/WebSocket streaming proxy, request logging, CORS |
| AI Service | Python 3.12 + FastAPI: all LLM orchestration, RAG, and agents |
| Relational DB | PostgreSQL: users, conversations, messages, files, usage |
| Vector DB | ChromaDB (persistent client): embeddings, one collection per user/workspace |
| Cache / Queue | Redis: rate limits, sessions, background jobs |
| Orchestration | docker-compose, monorepo layout |

**Monorepo layout:**

```
/frontend
/gateway-go
/ai-service
/infra
```

---

## MODEL PROVIDERS

- OpenAI and Anthropic through a provider abstraction (adapter pattern) so models can be swapped from config.
- Keys come from `.env` (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). Model names are env-configurable, never hardcoded.
- Support streaming, system prompts, temperature, max tokens, and automatic fallback to the other provider on failure or timeout.
- Include a model selector in the UI.

---

## AI SERVICE (Python)

1. **FastAPI** with async endpoints, Pydantic v2 schemas, and SSE token streaming.
2. **LangChain** for prompt templates, loaders, text splitters, and retrievers.
3. **LangGraph** for the agent workflow:
   `router node → (direct answer | RAG retrieval | tool call | web search) → response synthesis → memory update`
   Use checkpointing for conversation state.
4. **RAG pipeline:**
   - Ingest PDF, DOCX, TXT, MD, and URLs.
   - Chunk with recursive splitting (~800 tokens, 100 overlap).
   - Embed with Hugging Face sentence-transformers (e.g., `BAAI/bge-small-en-v1.5`) running locally; the embedding model must be configurable.
   - Store in ChromaDB with metadata (`user_id`, `doc_id`, `page`, `source`).
   - Retrieve top-k with MMR, optionally rerank with a Hugging Face cross-encoder.
   - Answers must include source citations.
5. **Tools:** calculator, web search, file Q&A, code interpreter (sandboxed, or disabled by default).
6. **Conversation memory:** sliding window plus rolling summary stored in Postgres.
7. **Auto-generate conversation titles.**
8. **Tracing:** LangSmith or OpenTelemetry (optional via env flag).

---

## GO GATEWAY

- JWT auth (register / login / refresh), password hashing with argon2 or bcrypt.
- Per-user rate limiting backed by Redis.
- Reverse-proxy and stream SSE from the AI service to the client without buffering.
- Request ID middleware, structured logging (zerolog or slog), health and readiness endpoints.
- Graceful shutdown and context timeouts.

---

## API (REST)

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh

GET    /conversations
POST   /conversations
DELETE /conversations/{id}
GET    /conversations/{id}/messages

POST   /chat/stream        (SSE: model, conversation_id, message, use_rag, doc_ids)

POST   /documents/upload
GET    /documents
DELETE /documents/{id}

GET    /models
GET    /usage
```

Provide an OpenAPI spec and typed client generation for the frontend.

---

## FRONTEND: APPLE LIQUID GLASS DESIGN

### Visual language

- Translucent, layered glass surfaces: `backdrop-filter: blur(20-40px) saturate(180%)`, 1px inner highlight borders, soft specular gradients at edges, subtle layered shadows.
- Optional SVG `feDisplacementMap` filter for a lens/refraction effect on key panels.
- Fluid, depth-aware animations (spring physics, morphing sidebars, shimmer on hover).
- Vibrant blurred gradient/mesh background that shows through the glass.
- Rounded corners (20-28px), SF-style typography (Inter or SF Pro fallback), generous spacing.
- Light and dark mode with automatic system detection.
- Respect `prefers-reduced-motion` and keep text contrast WCAG AA.

### UI features

- Glass sidebar with conversation history, search, and rename/delete.
- Glass floating message composer with file attach, model picker, and RAG toggle.
- Streaming markdown rendering with syntax-highlighted code blocks, copy button, tables, and LaTeX.
- Message actions: regenerate, edit, copy, thumbs up/down.
- Citation chips that open a glass popover with the source snippet.
- Document manager panel with drag-and-drop upload and ingestion progress.
- Fully responsive (mobile first), keyboard shortcuts, skeleton loaders, error toasts.

---

## DATA MODEL (Postgres)

Tables: `users`, `conversations`, `messages` (role, content, model, tokens, sources JSON), `documents`, `document_chunks_meta`, `usage_logs`.

Use Alembic migrations (Python) and include indexes.

---

## SECURITY & PRODUCTION REQUIREMENTS

- Secrets only via environment variables; ship a `.env.example`.
- Input validation, file type and size limits, per-user data isolation using Chroma metadata filters.
- Prompt-injection mitigation on retrieved content (delimit and label untrusted context).
- CORS allowlist, security headers, no stack traces in responses.
- Retry with exponential backoff and timeouts on all LLM calls.
- Token and cost tracking per user.
- Structured logging, `/health` and `/ready` endpoints, Prometheus metrics.
- Multi-stage Dockerfiles, docker-compose for local dev, GitHub Actions CI (lint, test, build).

---

## TESTING

- **Python:** pytest (unit + integration with mocked LLMs).
- **Go:** table-driven tests.
- **Frontend:** Playwright smoke tests for the chat flow.

---

## DELIVERY PLAN

Do these in order and confirm each works before moving on.

| Phase | Scope |
|---|---|
| 1 | Repo scaffold, docker-compose, Postgres/Redis/Chroma up, health checks |
| 2 | FastAPI chat with OpenAI + Anthropic streaming and provider fallback |
| 3 | Go gateway with auth, rate limiting, and SSE proxy |
| 4 | Frontend with Liquid Glass UI and streaming chat connected end to end |
| 5 | RAG ingestion, retrieval, and citations |
| 6 | LangGraph agent with tools and memory |
| 7 | Observability, tests, CI, README |

---

## OUTPUT RULES

- Show the full file tree first, then complete code for each file (no placeholders or "TODO").
- Explain run commands after each phase.
- Keep the code idiomatic, typed, and commented only where logic isn't obvious.
- Finish with a README covering setup, env vars, an architecture diagram (Mermaid), and a deployment guide.

---

## NOTES FOR THE USER

- **ChromaDB is itself a vector database.** It is used for embeddings, while Postgres stores users, chats, and messages.
- **Go's role** is the gateway (auth, rate limiting, streaming). Python handles AI logic, since the AI ecosystem lives there.
- **Keep API keys out of prompts and Git.** Put them in a `.env` file only.
- **Fast path:** build Phases 1 to 4 first for a working chat app, then add RAG and agents.
