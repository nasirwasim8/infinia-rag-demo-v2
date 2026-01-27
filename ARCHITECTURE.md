# DDN RAG v2 - Architecture Guide

This document explains the complete restructure of the DDN RAG application from a single 5,400-line Gradio Python file into a clean, modular React + FastAPI architecture.

---

## Quick Start (For Your Colleague)

### 1. Run the Installation Script

```bash
./install.sh
```

This will:
- Check Python and Node.js versions
- Create Python virtual environment
- Install all backend dependencies
- Create `.env` file from template
- Install all frontend dependencies

### 2. Add Your NVIDIA API Key

```bash
nano backend/.env
# Add your NVIDIA_API_KEY
```

### 3. Run Both Servers

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Open the App

- **Frontend:** http://localhost:5173
- **API Docs:** http://localhost:8000/docs

---

## What Changed: Before vs After

### Before (Original)
```
ddn-RAG/
├── Final_FAISS_ddn_infinia_DEMO_Nvidia_ER.py  # 5,400 lines - EVERYTHING mixed together
├── ddn-colors.css                              # CSS hacks for Gradio
├── requirements.txt
└── Logos/
```

**Problems:**
- Single monolithic file mixing UI, backend logic, storage, AI services
- Gradio limitations requiring CSS `!important` hacks everywhere
- No separation of concerns
- Difficult to test, maintain, or extend
- No type safety

### After (v2 Structure)
```
ddn-rag-v2/
├── backend/                      # FastAPI Python Backend
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py        # All REST API endpoints
│   │   ├── core/
│   │   │   └── config.py        # Environment variables & settings
│   │   ├── models/
│   │   │   └── schemas.py       # Pydantic request/response models
│   │   └── services/
│   │       ├── storage.py       # S3Handler for AWS & DDN INFINIA
│   │       ├── vector_store.py  # FAISS + SentenceTransformer
│   │       ├── document.py      # PDF, DOCX, XLSX extraction
│   │       ├── nvidia.py        # LLM, Reranker, Guardrails
│   │       └── metrics.py       # TTFB monitoring
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                     # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx       # Top navigation (About/Demo)
│   │   │   └── DemoSidebar.tsx  # Sidebar for demo sections
│   │   ├── pages/               # 7 page components
│   │   │   ├── About.tsx        # Landing page (merged Architecture + About)
│   │   │   ├── Configuration.tsx
│   │   │   ├── Documents.tsx
│   │   │   ├── ContinuousIngestion.tsx
│   │   │   ├── Chat.tsx
│   │   │   ├── Metrics.tsx
│   │   │   └── BusinessImpact.tsx
│   │   ├── services/api.ts      # API client with TypeScript types
│   │   └── styles/              # Tailwind CSS
│   ├── public/                  # Production assets
│   ├── Logos/                   # Brand assets (DDN, NVIDIA)
│   └── package.json
│
├── README.md
├── ARCHITECTURE.md              # This file
└── install.sh                   # One-click setup script
```

---

## Backend Services Mapping

Here's where each piece of the original code now lives:

| Original Code | New Location | Description |
|---------------|--------------|-------------|
| `S3Config` class | `backend/app/core/config.py` | Storage configuration |
| `S3Handler` class | `backend/app/services/storage.py` | AWS & DDN INFINIA operations |
| `PersistentVectorStore` | `backend/app/services/vector_store.py` | FAISS + embeddings |
| `NvidiaLLMClient` | `backend/app/services/nvidia.py` | LLM API client |
| `NvidiaReranker` | `backend/app/services/nvidia.py` | NeMo reranking |
| `NvidiaGuardrails` | `backend/app/services/nvidia.py` | Content safety |
| `TTFBMonitor` | `backend/app/services/metrics.py` | Performance tracking |
| `extract_text_from_file()` | `backend/app/services/document.py` | Document processing |
| `create_chunks_enhanced()` | `backend/app/services/document.py` | Text chunking |
| Gradio UI tabs | `frontend/src/pages/*` | React components |

---

## Frontend Pages Mapping

| Original Gradio Tab | New React Page | Location |
|---------------------|----------------|----------|
| Overview + Architecture | About | `pages/About.tsx` |
| Configuration | Configuration | `pages/Configuration.tsx` |
| Documents | Documents | `pages/Documents.tsx` |
| Continuous Ingestion | Ingestion | `pages/ContinuousIngestion.tsx` |
| RAG Chat | RAG Chat | `pages/Chat.tsx` |
| Dashboard | Dashboard | `pages/Metrics.tsx` |
| Business Impact | ROI | `pages/BusinessImpact.tsx` |

---

## Navigation Structure

The new app has a cleaner navigation model:

```
┌─────────────────────────────────────────────────────────┐
│  [Logo] BUILD:RAG        [About] [Demo]      [NVIDIA]   │  ← Header
└─────────────────────────────────────────────────────────┘

When "About" is selected:
┌─────────────────────────────────────────────────────────┐
│                    Landing Page                          │
│  - Hero section with DDN + NVIDIA cards                 │
│  - Architecture diagram                                  │
│  - Performance stats                                     │
│  - "Start Demo" CTA button                              │
└─────────────────────────────────────────────────────────┘

When "Demo" is selected:
┌──────────────┬──────────────────────────────────────────┐
│  Sidebar     │                                          │
│  ──────────  │         Demo Content Area                │
│  Config      │                                          │
│  Documents   │         (Selected page renders here)     │
│  Ingestion   │                                          │
│  RAG Chat    │                                          │
│  Dashboard   │                                          │
│  ROI         │                                          │
└──────────────┴──────────────────────────────────────────┘
```

---

## API Endpoints

All endpoints are prefixed with `/api` (except health check):

### Configuration
```
POST /api/config/aws          # Configure AWS S3 credentials
POST /api/config/ddn          # Configure DDN INFINIA credentials
GET  /api/config/test/{provider}  # Test connection (aws or ddn_infinia)
```

### Documents
```
POST   /api/documents/upload           # Upload single document
POST   /api/documents/upload-multiple  # Upload multiple documents
DELETE /api/documents/clear            # Clear vector store
GET    /api/documents/count            # Get chunk count
```

### RAG Query
```
POST /api/rag/query    # Execute RAG query
GET  /api/rag/models   # List available LLM models
```

### Metrics
```
GET    /api/metrics            # All performance metrics
GET    /api/metrics/storage    # Storage performance only
GET    /api/metrics/retrieval  # Retrieval performance only
DELETE /api/metrics/clear      # Clear metrics
```

### Health
```
GET /health   # Health check with status of all services
```

---

## Environment Variables

Create `backend/.env` with:

```env
# === REQUIRED ===
NVIDIA_API_KEY=nvapi-xxxx          # Your NVIDIA API key for LLM/Reranking/Guardrails

# === OPTIONAL ===
OPENAI_API_KEY=sk-xxxx             # If you want OpenAI as fallback
HUGGINGFACE_TOKEN=hf_xxxx          # For gated HuggingFace models

# === DEFAULTS (can override) ===
EMBEDDING_MODEL=all-MiniLM-L6-v2   # Embedding model name
CHUNK_SIZE=500                      # Characters per chunk
CHUNK_OVERLAP=50                    # Overlap between chunks
```

**Note:** AWS S3 and DDN INFINIA credentials are configured via the UI (Configuration tab), not environment variables. This allows runtime configuration without restarts.

---

## Key API Examples

### Configure DDN INFINIA
```bash
curl -X POST http://localhost:8000/api/config/ddn \
  -H "Content-Type: application/json" \
  -d '{
    "access_key": "your-key",
    "secret_key": "your-secret",
    "bucket_name": "your-bucket",
    "endpoint_url": "https://your-ddn-endpoint",
    "region": "us-east-1"
  }'
```

### Test Connection
```bash
curl http://localhost:8000/api/config/test/ddn_infinia
```

### Upload Document
```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@document.pdf"
```

### RAG Query
```bash
curl -X POST http://localhost:8000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is DDN INFINIA?",
    "model": "nvidia/nvidia-nemotron-nano-9b-v2",
    "top_k": 5,
    "use_reranking": true,
    "use_guardrails": true
  }'
```

---

## Feature Comparison

| Feature | Original | v2 | Notes |
|---------|----------|-----|-------|
| Document Upload | ✅ | ✅ | Same functionality |
| Multi-format Support | ✅ | ✅ | PDF, DOCX, XLSX, PPTX, CSV, TXT |
| Dual Storage | ✅ | ✅ | AWS S3 + DDN INFINIA |
| TTFB Comparison | ✅ | ✅ | Real-time metrics |
| NVIDIA LLM | ✅ | ✅ | Nemotron, Llama, Mixtral |
| NeMo Reranker | ✅ | ✅ | With graceful fallback |
| Guardrails | ✅ | ✅ | Input/output safety |
| Business Calculator | ✅ | ✅ | All 9 parameters |
| Bucket Monitoring | ✅ | ⚠️ | UI present, backend polling not yet implemented |
| Benchmarks | ✅ | ⚠️ | Frontend simulates, backend endpoints TODO |
| NV-Ingest Chunking | ✅ | ⚠️ | Uses LangChain splitter (similar quality) |

---

## Dependencies

### Backend (Python 3.9+)
- FastAPI + Uvicorn (web server)
- FAISS (vector search)
- SentenceTransformers (embeddings)
- boto3 (S3/DDN storage)
- pdfplumber, python-docx, pandas, python-pptx (document processing)
- Pydantic (validation)

### Frontend (Node 18+)
- React 18
- TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- TanStack Query (data fetching)
- Framer Motion (animations)
- Lucide React (icons)

---

## Troubleshooting

### Backend won't start
```bash
# Check Python version (need 3.9+)
python --version

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### NVIDIA API errors
- Verify `NVIDIA_API_KEY` is set in `.env`
- Check key is valid at https://build.nvidia.com/

### Storage connection fails
- AWS: Check credentials and bucket permissions
- DDN: Verify endpoint URL includes `https://`
- DDN: The app disables SSL verification (self-signed certs OK)

### Frontend API calls fail
- Ensure backend is running on port 8000
- Vite proxy is configured in `vite.config.ts`

---

## Questions?

The codebase is now modular and each file has a single responsibility. Start with:
- `backend/app/api/routes.py` - to see all endpoints
- `backend/app/services/` - to understand backend logic
- `frontend/src/pages/` - to see UI components
- `frontend/src/services/api.ts` - to see API client

Happy coding!
