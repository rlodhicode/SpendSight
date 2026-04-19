# SpendSight — GCP Deploy Toolkit

A fully-automated, idempotent set of Python scripts that provision, manage,
pause, and tear down every GCP resource needed to run SpendSight in production.

---

## Directory layout

```
deploy/
├── deploy.py          # Full deployment orchestrator
├── teardown.py        # Delete all resources (irreversible)
├── pause.py           # Scale everything to zero / suspend SQL
├── resume.py          # Restore services after pausing
├── status.py          # Print health summary of all resources
├── config.py          # Shared constants (names, tiers, etc.)
└── scripts/
    ├── shell.py           # subprocess helpers
    ├── build.py           # Docker build + push to Artifact Registry
    ├── infra_network.py   # VPC + Serverless VPC Access connector
    ├── infra_pubsub.py    # Pub/Sub topic + subscription
    ├── infra_sql.py       # Cloud SQL (Postgres 16, private IP)
    ├── infra_redis.py     # Memorystore for Redis
    ├── infra_storage.py   # GCS bucket
    ├── secrets.py         # Secret Manager + Artifact Registry repo + IAM SA
    ├── svc_api.py         # FastAPI → Cloud Run
    ├── svc_worker.py      # Worker → Cloud Run (pull-mode Pub/Sub)
    └── svc_web.py         # React/Vite → Cloud Run
```

---

## Prerequisites

| Tool | Min version | Install |
|------|-------------|---------|
| `gcloud` CLI | 460+ | https://cloud.google.com/sdk |
| `docker` | 20+ | https://docs.docker.com/get-docker |
| Python | 3.10+ | https://python.org |

```bash
# Authenticate gcloud
gcloud auth login
gcloud auth application-default login
gcloud auth configure-docker us-central1-docker.pkg.dev
```

No extra Python packages are required — the scripts use only the stdlib.

---

## GCP APIs enabled automatically

The `network` step enables all necessary APIs:

- Cloud Run
- Cloud SQL Admin
- Memorystore (Redis)
- Pub/Sub
- Cloud Storage
- Secret Manager
- Artifact Registry
- Serverless VPC Access
- Service Networking
- Cloud Resource Manager

---

## Quick start

### 1. Full deployment

```bash
# From the repo root
python deploy/deploy.py \
  --project YOUR_PROJECT_ID \
  --region  us-central1
```

The orchestrator runs these steps in order:

| # | Step | What it creates |
|---|------|-----------------|
| 1 | `network` | Custom VPC `spendsight-vpc`, Serverless VPC connector, firewall rule |
| 2 | `pubsub` | Topic `bill-jobs`, subscription `bill-jobs-sub` |
| 3 | `sql` | Cloud SQL Postgres 16 instance (private IP), DB, user, password secret |
| 4 | `redis` | Memorystore for Redis 7 (BASIC, 1 GB) |
| 5 | `storage` | GCS bucket `<project>-spendsight-uploads-prod` |
| 6 | `secrets` | Artifact Registry repo, service account + IAM, JWT secret |
| 7 | `api` | Builds & deploys `spendsight-api` Cloud Run service |
| 8 | `worker` | Builds & deploys `spendsight-worker` Cloud Run service |
| 9 | `web` | Builds & deploys `spendsight-web` Cloud Run service, patches API CORS |

All steps are **idempotent** — rerunning is safe and skips already-existing resources.

### 2. Skip steps you've already run

```bash
python deploy/deploy.py \
  --project YOUR_PROJECT_ID \
  --skip network pubsub sql redis storage secrets
```

### 3. Check deployment health

```bash
python deploy/status.py --project YOUR_PROJECT_ID
```

Sample output:
```
SpendSight Status — project=my-project  region=us-central1

── Cloud Run ──────────────────────────────────────────
  spendsight-api                  ✓ Ready             https://spendsight-api-xxx.run.app
  spendsight-worker               ✓ Ready             (internal)
  spendsight-web                  ✓ Ready             https://spendsight-web-xxx.run.app

── Cloud SQL ───────────────────────────────────────────
  spendsight-prod                 RUNNABLE      policy=ALWAYS  ip=10.x.x.x

── Memorystore (Redis) ──────────────────────────────────
  spendsight-redis-prod           READY         10.x.x.x:6379

── Pub/Sub ──────────────────────────────────────────────
  ✓  topic             bill-jobs
  ✓  subscription      bill-jobs-sub

── GCS Bucket ───────────────────────────────────────────
  ✓  gs://my-project-spendsight-uploads-prod  (US-CENTRAL1)
```

---

## Pausing (minimise spend)

Scales all Cloud Run services to zero and suspends Cloud SQL compute.
No data is lost.

```bash
python deploy/pause.py --project YOUR_PROJECT_ID
```

**Cost breakdown after pausing:**

| Resource | Paused cost |
|----------|-------------|
| Cloud Run | **$0** — billed per request only |
| Cloud SQL | **~$0.09/GB-month** storage only; compute stops |
| Memorystore | **~$0.035/GB-hour** — cannot be paused at BASIC tier |
| GCS | **~$0.02/GB-month** storage only |
| Pub/Sub | **$0** — no messages |

> **Tip:** If you won't need the environment for weeks, run `teardown.py` instead
> to eliminate Memorystore costs entirely.

### Resuming

```bash
python deploy/resume.py --project YOUR_PROJECT_ID
```

SQL starts up first (takes ~30 s), then Cloud Run scaling is restored.

---

## Full teardown

⚠️ **Irreversible** — deletes everything including the database and all uploaded bills.

```bash
python deploy/teardown.py --project YOUR_PROJECT_ID

# Non-interactive (CI/CD):
python deploy/teardown.py --project YOUR_PROJECT_ID --yes
```

Deletion order (safe dependency ordering):

1. Cloud Run services
2. Cloud SQL instance (deletion protection disabled automatically)
3. Memorystore Redis
4. Pub/Sub subscription → topic
5. GCS bucket (all objects deleted first)
6. Secret Manager secrets
7. Artifact Registry repo
8. Service account
9. VPC connector + firewall rule

### Partial teardown

```bash
# Delete only Cloud Run and SQL, keep everything else
python deploy/teardown.py --project YOUR_PROJECT_ID --skip redis pubsub storage secrets ar network
```

---

## Architecture deployed

```
Browser
  │
  ▼
Cloud Run: spendsight-web  (React/Vite, public)
  │  VITE_API_BASE_URL baked at build time
  │
  ▼
Cloud Run: spendsight-api  (FastAPI, public)
  │  VPC connector → private IP
  ├──► Cloud SQL Postgres 16   (spendsight-prod, private IP)
  ├──► Memorystore Redis 7     (job status + analytics cache)
  ├──► GCS bucket              (bill document storage)
  └──► Pub/Sub topic           (bill-jobs → bill-jobs-sub)
                                        │
                                        ▼
                         Cloud Run: spendsight-worker  (internal)
                           │  VPC connector → private IP
                           ├──► Cloud SQL (write bill records)
                           ├──► Memorystore (write job status)
                           ├──► GCS (read uploaded documents)
                           └──► Vertex AI Gemini (extraction)
```

---

## Networking

All inter-service communication uses **private IPs** via a Serverless VPC Access
connector (`10.8.0.0/28`).  No resource other than the API and Web Cloud Run
services has a public IP.

Cloud SQL has `--no-assign-ip` (private-only).  
Memorystore is VPC-native.  
The worker Cloud Run service has `--no-allow-unauthenticated`.

---

## Secrets

| Secret name | Contents | Created by |
|-------------|----------|-----------|
| `spendsight-db-password` | Postgres password (random 32-char) | `infra_sql.py` |
| `spendsight-jwt-secret` | JWT signing key (random 48-char) | `secrets.py` |

Secrets are mounted as environment variables by Cloud Run via `--set-secrets`.
The `DATABASE_URL` is assembled at container startup from its component parts
(`DB_USER`, `DB_PASSWORD`, `DB_HOST`, etc.) to avoid storing the full URL as a
single secret.

---

## IAM service account

A dedicated SA `spendsight-run@<project>.iam.gserviceaccount.com` is assigned
to all three Cloud Run services with the minimum required roles:

- `roles/secretmanager.secretAccessor`
- `roles/cloudsql.client`
- `roles/storage.objectAdmin`
- `roles/pubsub.publisher`
- `roles/pubsub.subscriber`
- `roles/redis.viewer`

---

## Customising config

Edit `deploy/config.py` to change:

- `SQL_TIER` — e.g. `db-n1-standard-2` for more CPU
- `REDIS_MEMORY_GB` — increase for larger cache
- `REDIS_TIER` — change to `STANDARD_HA` for HA Redis
- `PUBSUB_TOPIC` / `PUBSUB_SUBSCRIPTION` — rename queues

---

## Running individual scripts

Every script can be run standalone:

```bash
# Just re-deploy the API
python deploy/scripts/svc_api.py --project my-project --region us-central1

# Just provision Pub/Sub
python deploy/scripts/infra_pubsub.py --project my-project

# Just build and push the worker image
python -c "
import sys; sys.path.insert(0,'deploy')
import config as cfg; cfg.PROJECT='my-project'; cfg.REGION='us-central1'
from scripts.build import build_and_push
build_and_push('spendsight-worker', 'apps/worker')
"
```
