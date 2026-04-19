"""
deploy/scripts/svc_api.py
Builds the FastAPI backend image and deploys it to Cloud Run.

Environment variables are wired from:
  • Secret Manager   → DB password, JWT secret
  • Infra helpers    → Redis URL, DB connection string, bucket name
  • Literal values   → everything else

The service is accessible publicly (--allow-unauthenticated) so the
React SPA can call it directly from the browser.
"""

from __future__ import annotations
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config as cfg
from scripts.shell import gcloud, run
from scripts.build import build_and_push, image_tag
from scripts import infra_sql, infra_redis, manage_secrets as sec_module


def _get_db_url() -> str:
    ip       = infra_sql.get_db_private_ip()
    db       = cfg.db_name()
    user     = cfg.db_user()
    return f"postgresql://{user}:$(cat /dev/shm/db_pass)@{ip}:5432/{db}"


def _build_db_url_secret_ref() -> str:
    """Return a Cloud Run --set-secrets flag that mounts DB password as env."""
    # We'll compose the URL in the Cloud Run env using a helper secret
    return f"DB_PASSWORD=spendsight-db-password:latest"


def _write_env_vars_file(env_dict: dict) -> str:
    """
    Write env vars to a temp YAML file for --env-vars-file.

    Using a file completely bypasses shell and gcloud comma-escaping issues.
    Values that contain commas (e.g. ALLOWED_UPLOAD_EXTENSIONS) are safe
    because gcloud reads the YAML directly — no shell ever tokenises it.

    Returns the path to the temp file (caller must delete it).
    """
    yaml_lines = "\n".join(f'{k}: "{v}"' for k, v in env_dict.items())
    f = tempfile.NamedTemporaryFile(
        mode="w", suffix=".yaml", delete=False, encoding="utf-8"
    )
    f.write(yaml_lines + "\n")
    f.close()
    return f.name


def deploy():
    # 1 – Build & push image
    image = build_and_push("spendsight-api", "apps/api")

    # 2 – Gather runtime values
    db_ip     = infra_sql.get_db_private_ip()
    redis_url = infra_redis.get_redis_url()
    bucket    = cfg.gcs_bucket_name()
    sa        = sec_module.get_sa_email()
    conn      = cfg.connector_name()
    db        = cfg.db_name()
    user      = cfg.db_user()

    # Database URL — password injected via Secret Manager at runtime.
    # Each component is passed as a separate env var; the container assembles
    # DATABASE_URL at startup via the --command/--args entrypoint below.
    env_dict = {
        "DB_HOST":                         db_ip,
        "DB_NAME":                         db,
        "DB_USER":                         user,
        "DB_PORT":                         "5432",
        "REDIS_URL":                       redis_url,
        "QUEUE_PROVIDER":                  "pubsub",
        "PUBSUB_TOPIC":                    cfg.PUBSUB_TOPIC,
        "PUBSUB_PROJECT_ID":               cfg.PROJECT,
        "PUBSUB_AUTO_CREATE_TOPIC":        "false",
        "STORAGE_PROVIDER":                "gcs",
        "GCS_BUCKET":                      bucket,
        "GCP_PROJECT_ID":                  cfg.PROJECT,
        "GCP_LOCATION":                    cfg.REGION,
        "LLM_PROVIDER":                    "gemini",
        "GEMINI_MODEL":                    "gemini-2.5-flash",
        "EXTRACTION_CONFIDENCE_THRESHOLD": "0.75",
        # Commas in this value are safe inside a YAML file — no escaping needed.
        "ALLOWED_UPLOAD_EXTENSIONS":       ".pdf,.png,.jpg,.jpeg,.docx",
        "JOB_STATUS_TTL_SECONDS":          "86400",
        "ANALYTICS_CACHE_TTL_SECONDS":     "600",
    }

    secrets_flags = [
        f"JWT_SECRET={cfg.SECRET_JWT_SECRET}:latest",
        f"DB_PASSWORD={cfg.SECRET_DB_PASSWORD}:latest",
    ]

    # 3 – Deploy to Cloud Run
    print(f"  Deploying API to Cloud Run ({cfg.API_SVC}) …")
    env_vars_path = _write_env_vars_file(env_dict)
    try:
        # Assemble DATABASE_URL at container startup from its injected components.
        # --args uses comma as separator; the sh -c "..." is a single token.
        startup_sh = (
            "DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME "
            "uvicorn app.main:app --host 0.0.0.0 --port 8080"
        )
        cmd = [
            "gcloud", "run", "deploy", cfg.API_SVC,
            f"--image={image}",
            f"--region={cfg.REGION}",
            "--platform=managed",
            "--allow-unauthenticated",
            f"--service-account={sa}",
            f"--vpc-connector={conn}",
            "--vpc-egress=private-ranges-only",
            # --env-vars-file reads key: "value" YAML — completely avoids the
            # gcloud comma-escaping bug that affects --set-env-vars on all shells.
            f"--env-vars-file={env_vars_path}",
            f"--set-secrets={','.join(secrets_flags)}",
            "--min-instances=0",
            "--max-instances=10",
            "--memory=512Mi",
            "--cpu=1",
            "--concurrency=80",
            "--timeout=60",
            f"--project={cfg.PROJECT}",
            "--command=sh",
            f"--args=-c,{startup_sh}",
        ]
        try:
            run(cmd)
        except SystemExit:
            _print_latest_revision_logs()
            raise
    finally:
        os.unlink(env_vars_path)

    # 4 – Expose the URL for the web frontend CORS config
    url = _get_service_url(cfg.API_SVC)
    print(f"  ✓ API deployed → {url}")

    # 5 – CORS is handled by API regex config; no post-deploy service mutation.

    return url


def _get_service_url(svc: str) -> str:
    import json
    raw = gcloud(
        "run", "services", "describe", svc,
        f"--region={cfg.REGION}",
        f"--project={cfg.PROJECT}",
        "--format=json",
        capture=True,
    )
    data = json.loads(raw)
    return data["status"]["url"]


def _print_latest_revision_logs(limit: int = 100) -> None:
    """
    Best-effort debugging aid: print recent logs from the newest revision when
    deployment fails, so root cause is visible immediately.
    """
    try:
        print(f"  Deployment failed. Showing recent service logs for '{cfg.API_SVC}':")
        run([
            "gcloud", "run", "services", "logs", "read", cfg.API_SVC,
            f"--region={cfg.REGION}",
            f"--project={cfg.PROJECT}",
            f"--limit={limit}",
        ], check=False)
    except Exception as exc:
        print(f"  Warning: failed to fetch Cloud Run revision logs: {exc}")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--project", required=True)
    p.add_argument("--region", default="us-central1")
    a = p.parse_args()
    cfg.PROJECT = a.project
    cfg.REGION  = a.region
    deploy()
