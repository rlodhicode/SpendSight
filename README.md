# SpendSight

Cloud-native utility bill analytics platform with isolated components:

- `apps/api`: FastAPI service for auth, uploads, job status, and analytics
- `apps/worker`: async processing worker (queue consumer + extraction + DB writes)
- `apps/web`: React dashboard for upload, status polling, and analytics views
- `infra`: Docker Compose for local dependencies and full-stack run

## Project layout

```text
spendsight/
  apps/
    api/
    worker/
    web/
  scripts/
```

Each app is intentionally self-contained so you can run components independently.

## Local prerequisites

- Python 3.11+
- Node.js 20+
- Docker Desktop

## 1) Start infrastructure

From repo root:

```powershell
docker compose -f docker-compose.yml up -d postgres redis
```

This brings up:

- PostgreSQL on `localhost:5434`
- Redis on `localhost:6379`

## 2) Run API

```powershell
cd apps/api
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

API docs: <http://localhost:8000/docs>

## 3) Run worker

In a second terminal:

```powershell
cd apps/worker
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python -m worker.main
```

## 4) Run web dashboard

In a third terminal:

```powershell
cd apps/web
npm install
copy .env.example .env
npm run dev
```

Open <http://localhost:5173>.

## Full stack via Docker

```powershell
docker compose -f docker-compose.yml up --build
```

If you already ran an older schema, reset volumes before first run with this update:

```powershell
docker compose -f docker-compose.yml down -v
```

## Environment variables and keys

### `apps/api/.env`

- `DATABASE_URL`: Postgres DSN
- `REDIS_URL`: Redis connection URL
- `JWT_SECRET`: secret for API auth token signing
- `UPLOAD_DIR`: local object-store backing path for `local://` mode
- `STORAGE_PROVIDER`: `local` or `gcs`
- `GCS_BUCKET`: required when `STORAGE_PROVIDER=gcs`
- `ALLOWED_UPLOAD_EXTENSIONS`: includes `.docx,.pdf,.png,.jpg,.jpeg`
- `QUEUE_NAME`: Redis list name for queued jobs
- `JOB_STATUS_TTL_SECONDS`: job status cache TTL (default 24h)
- `ANALYTICS_CACHE_TTL_SECONDS`: analytics cache TTL (default 10m)
- `CORS_ORIGINS`: comma-separated origins
- `LLM_PROVIDER`: currently `gemini`
- `GEMINI_MODEL`: default `gemini-2.5-flash`
- `GCP_PROJECT_ID`, `GCP_LOCATION`,
- `GOOGLE_APPLICATION_CREDENTIALS`: required for live Gemini/GCS runs

### `apps/worker/.env`

- `DATABASE_URL`
- `REDIS_URL`
- `QUEUE_NAME`
- `UPLOAD_DIR`
- `STORAGE_PROVIDER`
- `GCS_BUCKET`
- `POLL_TIMEOUT_SECONDS`
- `GEMINI_MODEL`
- `GCP_PROJECT_ID`, `GCP_LOCATION`,
- `GOOGLE_APPLICATION_CREDENTIALS`

### `apps/web/.env`

- `VITE_API_BASE_URL` (default `http://localhost:8000`)

## Expectations and scope

- Pipeline now uses a real LLM extraction call (Gemini via Vertex AI) with strict JSON schema validation.
- Worker reads documents from object URIs (`gs://...` or `local://...`) instead of direct file paths in DB.
- Current auth is email/password with JWT, suitable for course MVP.
- Common file types supported: `.docx`, `.pdf`, `.png`, `.jpg`, `.jpeg`.
