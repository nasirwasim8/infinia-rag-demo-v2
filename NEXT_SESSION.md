# Next Session Context — Build.DDN.RAG

**Saved:** 2026-02-27 · **GitHub:** `nasirwasim8/infinia-rag-demo-v2` (branch: `main`)  
**Rollback tag:** `v-stable` (last known good before scaling benchmark)

---

## Current State of Each Environment

| Environment | Host | PM2 Config | Backend Port | Frontend Port |
|-------------|------|------------|-------------|--------------|
| Production (Ubuntu) | `nwasim@10.36.97.158` | `ecosystem.config.js` | 8003 | 5174 |
| OCI Cloud | `159.54.182.181` | `ecosystem.oci.config.js` | 8000 | 5174 |
| HyperPOD GPU | `aidp@172.24.161.62` | `ecosystem.hpod.config.js` | 8000 | 5173 |

> **Important:** `frontend/vite.config.ts` is protected via `git update-index --skip-worktree` on Production (keeps port 8003). Always restore `backend/data/storage_config.json` from `/tmp/storage_config_backup.json` after any `git reset --hard`.

---

## What Was Accomplished This Session

1. **Fixed event loop blocking** — all S3 and LLM calls now run in `asyncio.run_in_executor()` in `routes.py` (upload, search, reranker, LLM inference)
2. **GPU metrics display** — `Documents.tsx` shows embedding device (CUDA/CPU), time, and throughput after upload
3. **Environment PM2 configs** — `ecosystem.hpod.config.js` (4G, port 8000/5173) and `ecosystem.oci.config.js` (2G, port 8000/5174) added to `main`
4. **Scaling Benchmark** — new `POST /api/benchmark/scaling` endpoint + SVG line chart in Documents tab
   - Scale Mode dropdown: Standard (1–50) / Extended (1–200) / Stress Test (1–500)
   - Business Outcome card with SVG icons (no emojis — rule for this project)
   - DDN stays flat, S3 curves up under concurrent load

---

## Tier 1 Features to Build Tomorrow

### 1. Tokens Per Second (TPS) Live Counter
**What:** Stream LLM response token-by-token via SSE, show real-time `47 tokens/sec` in RAG Chat  
**Files to touch:**
- `backend/app/api/routes.py` — add `GET /api/rag/stream` SSE endpoint using `StreamingResponse`
- `backend/app/services/nvidia_llm.py` — add streaming support to `chat_completion()`
- `frontend/src/pages/RAGChat.tsx` — consume SSE stream, count tokens, display TPS badge

**Key design:** Use `EventSource` in frontend or `fetch` with `ReadableStream`. Count `\n` tokens or split on spaces. Display: `⚡ 47 tok/sec`

---

### 2. Time to First Token (TTFT)
**What:** Record `Date.now()` when query is sent, record again when first SSE chunk arrives → display `First token: 312ms` badge  
**Files to touch:**
- Same SSE stream as TPS above (TTFT is just the time to first chunk)
- `frontend/src/pages/RAGChat.tsx` — add TTFT state, display as badge below response

**Key design:** Send a `[START]` event with server timestamp in SSE stream header. Client delta = TTFT.  
**DDN story:** Low DDN TTFB (91ms vs 1412ms) → retrieval done faster → LLM starts sooner → TTFT is lower.

---

### 3. Live Ingestion Dashboard
**What:** During document upload, show animated real-time metrics panel  
**Files to touch:**
- `backend/app/api/routes.py` — the existing SSE `/api/ingestion/stream` endpoint (already exists, uses `bucket_monitor`)
- `backend/app/services/vector_store.py` — emit progress events during `add_chunks()` loop
- `frontend/src/pages/Documents.tsx` — connect to SSE during upload, show animated counters

**Metrics to show:**
```
Chunks processed:   247 / 500    [████████░░] 49%
Embeddings/sec:     1,100 chunks/sec  (GPU CUDA)
DDN writes/sec:     89 writes/sec   ✅ 12ms avg
S3 writes/sec:      89 writes/sec   ⚠️ 287ms avg
```

**Key design:** The SSE endpoint at `/api/ingestion/stream` already exists. Wire it to a progress panel that auto-opens during upload and closes on completion.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `backend/app/api/routes.py` | All API endpoints — FastAPI |
| `backend/app/services/vector_store.py` | Embedding + S3 storage logic |
| `backend/app/services/nvidia_llm.py` | LLM chat completion |
| `frontend/src/pages/Documents.tsx` | Upload, benchmarks, scaling chart |
| `frontend/src/pages/RAGChat.tsx` | RAG query UI |
| `frontend/src/services/api.ts` | All API client functions |
| `ecosystem.config.js` | Production PM2 config (2G memory) |
| `ecosystem.hpod.config.js` | HyperPOD PM2 config (4G memory, GPU) |
| `ecosystem.oci.config.js` | OCI PM2 config (2G memory) |

---

## Rules for This Project
- **No emojis** — always use inline SVG clipart icons
- **No new npm dependencies** — use inline SVG for charts, no recharts/chart.js
- **Thread executors** — all blocking S3/LLM calls must use `asyncio.run_in_executor()`
- **Batch size = 8** for embeddings (prevents OOM on all environments)
- **Always backup** `backend/data/storage_config.json` before any `git reset --hard`
