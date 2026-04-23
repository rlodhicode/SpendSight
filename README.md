# SpendSight

## Project Participants

- Rayaan Lodhi

---

Cloud-native utility bill analytics platform with decoupled backend processing.

- `apps/api`: FastAPI service for auth, uploads, status, analytics, and human review APIs
- `apps/worker`: extraction worker service (Cloud Run push endpoint + local Redis consumer)
- `apps/web`: React dashboard
- `docker-compose.yml`: local infra and service orchestration

## Architecture (Current)

- Uploads are stored in object storage (`local://` for dev or `gs://` for GCS).
- API publishes versioned processing events.
- Queue provider is configurable:
  - `pubsub` for production
  - `redis` for local fallback
  - In local Pub/Sub mode, topic/subscription can be auto-created by the app.
- Worker extracts bill fields with Gemini on Vertex AI.
- Worker persists:
  - normalized bill records
  - field-level confidence rows
  - review-required status
- Redis stores job status (24h TTL) and analytics cache (10m TTL).

## Deployment

See the README in [deploy](deploy/README.md)

## Local Development

### Start infra

```powershell
docker compose up -d postgres redis pubsub-emulator fake-gcs
```

### API

```powershell
cd apps/api
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Worker (local Redis queue mode)

```powershell
cd apps/worker
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python -m worker.main
```

### Worker (Cloud Run service mode / Pub/Sub push compatible)

```powershell
cd apps/worker
uvicorn worker.main:app --host 0.0.0.0 --port 8080
```

### Web

```powershell
cd apps/web
npm install
copy .env.example .env
npm run dev
```

## Key Environment Variables

### Queue

- `QUEUE_PROVIDER`: `redis` or `pubsub`
- `QUEUE_NAME`: Redis list name (Redis mode)
- `PUBSUB_TOPIC`, `PUBSUB_PROJECT_ID`, `PUBSUB_EMULATOR_HOST`
- `PUBSUB_AUTO_CREATE_TOPIC` (API)
- `PUBSUB_AUTO_CREATE_RESOURCES` (worker)

### Storage

- `STORAGE_PROVIDER`: `local` or `gcs`
- `UPLOAD_DIR`: local object storage path
- `GCS_BUCKET`: required for `gcs`

### Extraction / Review

- `GEMINI_MODEL`: Vertex Gemini model ID
- `GCP_PROJECT_ID`, `GCP_LOCATION`
- `EXTRACTION_CONFIDENCE_THRESHOLD`: review threshold (default `0.75`)

## Review APIs

- `GET /api/v1/review/queue?page=1&page_size=20`
- `GET /api/v1/review/{bill_id}`
- `PATCH /api/v1/review/{bill_id}`

## Testing

```powershell
cd apps/api
pytest

cd ../worker
pytest
```

## Pub/Sub Dead-letter (Production)

Configure a main subscription with retry policy and a dead-letter topic/subscription.  
Recommended attributes: preserve `trace_id`, `job_id`, `schema_version`.
