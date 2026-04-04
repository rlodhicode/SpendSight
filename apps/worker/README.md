# SpendSight Worker

Asynchronous extraction worker for SpendSight.

## Modes

- **Local queue mode**: `python -m worker.main`
  - Pulls events from Redis queue (`QUEUE_PROVIDER=redis`) or Pub/Sub subscription (`QUEUE_PROVIDER=pubsub`)
- **Cloud Run service mode**: `uvicorn worker.main:app --host 0.0.0.0 --port 8080`
  - Accepts Pub/Sub push events on `POST /pubsub/push`

## Processing Responsibilities

1. Load event payload (`schema_version=v1`)
2. Fetch document from object storage (`gs://` or `local://`)
3. Extract structured fields using Vertex Gemini
4. Persist bill data and field confidence rows
5. Derive `review_required` and set job status (`completed` or `needs_review`)
6. Update Redis status key and invalidate analytics cache

## Health Endpoint

- `GET /health`

## Tests

```powershell
pytest
```
