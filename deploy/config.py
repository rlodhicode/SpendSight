"""
deploy/config.py  — shared runtime configuration for all deploy scripts.

All values default to sensible literals; deploy.py overwrites PROJECT/REGION/ENV
before calling any sub-module.
"""

# ── Mutated by deploy.py ──────────────────────────────────────────────────────
PROJECT: str = ""          # GCP project ID
REGION:  str = "us-central1"
ENV:     str = "prod"

# ── Derived helpers (read after PROJECT/REGION are set) ───────────────────────
def db_instance_name() -> str:
    return f"spendsight-{ENV}"

def db_name() -> str:
    return "spendsight"

def db_user() -> str:
    return "spendsight"

def redis_instance_name() -> str:
    return f"spendsight-redis-{ENV}"

def vpc_name() -> str:
    return "spendsight-vpc"

def connector_name() -> str:
    return "spendsight-connector"

def gcs_bucket_name() -> str:
    return f"{PROJECT}-spendsight-uploads-{ENV}"

def ar_repo() -> str:
    """Artifact Registry repository name."""
    return "spendsight"

def image_base() -> str:
    return f"{REGION}-docker.pkg.dev/{PROJECT}/{ar_repo()}"

# ── Pub/Sub ───────────────────────────────────────────────────────────────────
PUBSUB_TOPIC        = "bill-jobs"
PUBSUB_SUBSCRIPTION = "bill-jobs-sub"

# ── Cloud Run service names ───────────────────────────────────────────────────
API_SVC    = "spendsight-api"
WORKER_SVC = "spendsight-worker"
WEB_SVC    = "spendsight-web"

# ── Secret names (Secret Manager) ────────────────────────────────────────────
SECRET_DB_PASSWORD = "spendsight-db-password"
SECRET_JWT_SECRET  = "spendsight-jwt-secret"

# ── Cloud SQL tier ────────────────────────────────────────────────────────────
SQL_TIER = "db-f1-micro"          # cheapest always-on; upgrade as needed

# ── Redis tier ────────────────────────────────────────────────────────────────
REDIS_TIER       = "BASIC"
REDIS_MEMORY_GB  = 1
