"""
deploy/scripts/secrets.py
Bootstraps Secret Manager secrets and the Artifact Registry Docker repository.

Secrets managed here:
  • spendsight-db-password  — written by infra_sql.py; we just ensure it exists
  • spendsight-jwt-secret   — random 48-char token, written once

Also creates the Artifact Registry repository if needed and grants the
Cloud Run service account the required roles.
"""

from __future__ import annotations
import secrets as _secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config as cfg
from scripts.shell import gcloud, run, run_ok


# ── Artifact Registry ─────────────────────────────────────────────────────────

def _ensure_ar_repo():
    repo = cfg.ar_repo()
    exists = run_ok(
        f"gcloud artifacts repositories describe {repo}"
        f" --location={cfg.REGION} --project={cfg.PROJECT}"
    )
    if exists:
        print(f"  AR repo '{repo}' already exists — skipping.")
        return
    print(f"  Creating Artifact Registry Docker repo '{repo}' …")
    gcloud(
        "artifacts", "repositories", "create", repo,
        "--repository-format=docker",
        f"--location={cfg.REGION}",
        "--description=SpendSight container images",
        "--project", cfg.PROJECT,
    )


# ── Service account & IAM ─────────────────────────────────────────────────────

def _ensure_service_account() -> str:
    sa_name  = "spendsight-run"
    sa_email = f"{sa_name}@{cfg.PROJECT}.iam.gserviceaccount.com"
    exists = run_ok(
        f"gcloud iam service-accounts describe {sa_email} --project={cfg.PROJECT}"
    )
    if not exists:
        print(f"  Creating service account '{sa_name}' …")
        gcloud(
            "iam", "service-accounts", "create", sa_name,
            "--display-name=SpendSight Cloud Run SA",
            "--project", cfg.PROJECT,
        )
    else:
        print(f"  Service account '{sa_email}' already exists.")

    roles = [
        "roles/secretmanager.secretAccessor",
        "roles/cloudsql.client",
        "roles/storage.objectAdmin",
        "roles/pubsub.publisher",
        "roles/pubsub.subscriber",
        "roles/pubsub.viewer",
        "roles/redis.viewer",
        "roles/aiplatform.user",
    ]
    for role in roles:
        run_ok(
            f"gcloud projects add-iam-policy-binding {cfg.PROJECT}"
            f" --member=serviceAccount:{sa_email} --role={role}"
            " --condition=None"
        )

    return sa_email


# ── Secrets ───────────────────────────────────────────────────────────────────

def _ensure_jwt_secret():
    secret = cfg.SECRET_JWT_SECRET
    exists = run_ok(
        f"gcloud secrets describe {secret} --project={cfg.PROJECT}"
    )
    if exists:
        print(f"  Secret '{secret}' already exists — skipping.")
        return
    value = _secrets.token_urlsafe(48)
    print(f"  Creating secret '{secret}' …")
    run(
        ["gcloud", "secrets", "create", secret,
         "--replication-policy=automatic",
         f"--project={cfg.PROJECT}"],
    )
    run(
        ["gcloud", "secrets", "versions", "add", secret,
         "--data-file=-", f"--project={cfg.PROJECT}"],
        input=value,
    )


# ── Public entry point ────────────────────────────────────────────────────────

def deploy():
    _ensure_ar_repo()
    sa = _ensure_service_account()
    _ensure_jwt_secret()
    print(f"  ✓ Secrets & Artifact Registry ready. SA: {sa}")


def get_sa_email() -> str:
    return f"spendsight-run@{cfg.PROJECT}.iam.gserviceaccount.com"


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--project", required=True)
    p.add_argument("--region", default="us-central1")
    a = p.parse_args()
    cfg.PROJECT = a.project
    cfg.REGION  = a.region
    deploy()
