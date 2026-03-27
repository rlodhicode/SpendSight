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
  infra/
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
docker compose -f infra/docker-compose.yml up -d postgres redis
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
docker compose -f infra/docker-compose.yml up --build
```

## Environment variables and keys

### `apps/api/.env`

- `DATABASE_URL`: Postgres DSN
- `REDIS_URL`: Redis connection URL
- `JWT_SECRET`: secret for API auth token signing
- `UPLOAD_DIR`: local file storage path
- `QUEUE_NAME`: Redis list name for queued jobs
- `JOB_STATUS_TTL_SECONDS`: job status cache TTL (default 24h)
- `ANALYTICS_CACHE_TTL_SECONDS`: analytics cache TTL (default 10m)
- `CORS_ORIGINS`: comma-separated origins
- `DOCUMENT_AI_ENABLED`: `true/false`
- `GCP_PROJECT_ID`, `GCP_LOCATION`, `GCP_DOCUMENT_AI_PROCESSOR_ID`: required only when `DOCUMENT_AI_ENABLED=true`
- `GOOGLE_APPLICATION_CREDENTIALS`: path to GCP service account JSON only for real GCP runs

### `apps/worker/.env`

- `DATABASE_URL`
- `REDIS_URL`
- `QUEUE_NAME`
- `UPLOAD_DIR`
- `POLL_TIMEOUT_SECONDS`
- `DOCUMENT_AI_ENABLED`
- same optional GCP Document AI vars as API

### `apps/web/.env`

- `VITE_API_BASE_URL` (default `http://localhost:8000`)

## Expectations and scope

- Local mode uses Redis queue + local file storage and a deterministic mock extractor.
- Real GCP mode can be enabled with env flags and credentials.
- Current auth is email/password with JWT, suitable for course MVP.
- Document AI integration is structured for extension; local runs do not require cloud keys.
