"""
deploy/scripts/svc_worker.py
Builds the worker image and deploys it to Cloud Run as a long-running
service in pull-subscription mode.

The worker pulls from the Pub/Sub subscription in a loop; it does NOT
use Cloud Run's built-in push integration so that we keep the existing
`worker.main.run_local_worker_loop()` path unchanged.

We use `--min-instances=1` so there's always one warm instance polling
the subscription without cold-start latency.
"""

from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config as cfg
from scripts.shell import run, gcloud
from scripts.build import build_and_push
from scripts import infra_sql, infra_redis, manage_secrets as sec_module


def deploy():
    # 1 – Build & push image
    image = build_and_push("spendsight-worker", "apps/worker")

    # 2 – Runtime values
    db_ip     = infra_sql.get_db_private_ip()
    redis_url = infra_redis.get_redis_url()
    bucket    = cfg.gcs_bucket_name()
    sa        = sec_module.get_sa_email()
    conn      = cfg.connector_name()
    db        = cfg.db_name()
    user      = cfg.db_user()

    env_vars = ",".join([
        f"DB_HOST={db_ip}",
        f"DB_NAME={db}",
        f"DB_USER={user}",
        f"DB_PORT=5432",
        f"REDIS_URL={redis_url}",
        f"QUEUE_PROVIDER=pubsub",
        f"PUBSUB_TOPIC={cfg.PUBSUB_TOPIC}",
        f"PUBSUB_SUBSCRIPTION={cfg.PUBSUB_SUBSCRIPTION}",
        f"PUBSUB_PROJECT_ID={cfg.PROJECT}",
        f"PUBSUB_AUTO_CREATE_RESOURCES=false",   # already created by infra step
        f"STORAGE_PROVIDER=gcs",
        f"GCS_BUCKET={bucket}",
        f"GCP_PROJECT_ID={cfg.PROJECT}",
        f"GCP_LOCATION={cfg.REGION}",
        f"GEMINI_MODEL=gemini-2.5-flash",
        f"EXTRACTION_CONFIDENCE_THRESHOLD=0.75",
        f"JOB_STATUS_TTL_SECONDS=86400",
        f"POLL_TIMEOUT_SECONDS=5",
        f"WORKER_LOOP_ENABLED=true",
    ])

    secrets_flags = [
        f"DB_PASSWORD={cfg.SECRET_DB_PASSWORD}:latest",
    ]

    # 3 – Deploy
    print(f"  Deploying Worker to Cloud Run ({cfg.WORKER_SVC}) …")
    startup_sh = (
        "DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME "
        "uvicorn worker.main:app --host 0.0.0.0 --port 8080"
    )
    cmd = [
        "gcloud", "run", "deploy", cfg.WORKER_SVC,
        f"--image={image}",
        f"--region={cfg.REGION}",
        "--platform=managed",
        "--no-allow-unauthenticated",    # worker has no public HTTP API
        f"--service-account={sa}",
        f"--vpc-connector={conn}",
        "--vpc-egress=private-ranges-only",
        f"--set-env-vars={env_vars}",
        f"--set-secrets={','.join(secrets_flags)}",
        "--min-instances=1",             # always-on for queue polling
        "--max-instances=5",
        "--memory=1Gi",
        "--cpu=1",
        "--concurrency=1",               # one job per instance
        "--timeout=3600",                # long timeout for extraction jobs
        f"--project={cfg.PROJECT}",
        "--command=sh",
        f"--args=-c,{startup_sh}",
    ]
    run(cmd)

    # The worker has no public URL; confirm it's deployed
    print(f"  ✓ Worker deployed as '{cfg.WORKER_SVC}'.")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--project", required=True)
    p.add_argument("--region", default="us-central1")
    a = p.parse_args()
    cfg.PROJECT = a.project
    cfg.REGION  = a.region
    deploy()
