# SpendSight API

FastAPI backend for auth, upload, status, analytics, and human review workflows.

## Core Responsibilities

- Authenticate users and issue JWTs
- Upload bill files to object storage
- Publish async processing events (`ProcessingEvent`)
- Serve job status from Redis cache + DB fallback
- Serve analytics with Redis caching
- Expose review queue/detail/edit APIs for low-confidence extraction outputs

## Queue Providers

- `QUEUE_PROVIDER=redis`: local/dev fallback (`LPUSH` queue)
- `QUEUE_PROVIDER=pubsub`: production managed queue

## Review Endpoints

- `GET /api/v1/review/queue`
- `GET /api/v1/review/{bill_id}`
- `PATCH /api/v1/review/{bill_id}`

## Run

```powershell
uvicorn app.main:app --reload --port 8000
```

## Tests

```powershell
pytest
```
