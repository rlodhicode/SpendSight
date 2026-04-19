"""
deploy/scripts/infra_sql.py
Provisions a Cloud SQL PostgreSQL instance with a private IP on the
project VPC, creates the application database and user, and stores the
generated password in Secret Manager.

The instance uses a private IP so Cloud Run services reach it via the
Serverless VPC Access connector — no public IP required.
"""

from __future__ import annotations
import json
import secrets as _secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config as cfg
from scripts.shell import gcloud, gcloud_json, run_ok


def _ensure_private_services_access():
    """
    Cloud SQL private IP requires a peered service networking range on the VPC.
    This is idempotent — gcloud errors are suppressed when already configured.
    """
    vpc = cfg.vpc_name()
    print("  Allocating private services IP range …")
    # Allocate a global IP range for managed services
    run_ok(
        f"gcloud compute addresses create google-managed-services-{vpc}"
        f" --global --purpose=VPC_PEERING --prefix-length=20"
        f" --network={vpc} --project={cfg.PROJECT}"
    )
    # Create / update the peering
    from scripts.shell import run
    run(
        [
            "gcloud", "services", "vpc-peerings", "connect",
            f"--service=servicenetworking.googleapis.com",
            f"--ranges=google-managed-services-{vpc}",
            f"--network={vpc}",
            f"--project={cfg.PROJECT}",
        ],
        check=False,   # may already exist
    )


def _ensure_instance() -> bool:
    """Returns True if the instance was just created (False = already existed)."""
    instance = cfg.db_instance_name()
    exists = run_ok(
        f"gcloud sql instances describe {instance} --project {cfg.PROJECT}"
    )
    if exists:
        print(f"  Cloud SQL instance '{instance}' already exists — skipping.")
        return False

    vpc = cfg.vpc_name()
    print(f"  Creating Cloud SQL instance '{instance}' (this takes ~5 min) …")
    gcloud(
        "sql", "instances", "create", instance,
        "--database-version=POSTGRES_16",
        f"--tier={cfg.SQL_TIER}",
        "--edition=ENTERPRISE",
        f"--region={cfg.REGION}",
        "--no-assign-ip",                        # private IP only
        f"--network=projects/{cfg.PROJECT}/global/networks/{vpc}",
        "--enable-google-private-path",
        "--deletion-protection",                 # safety guard
        "--project", cfg.PROJECT,
    )
    return True


def _ensure_database():
    instance = cfg.db_instance_name()
    db = cfg.db_name()
    try:
        gcloud(
            "sql", "databases", "describe", db,
            f"--instance={instance}",
            "--project", cfg.PROJECT,
        )
        print(f"  Database '{db}' already exists — skipping.")
    except SystemExit:
        print(f"  Creating database '{db}' …")
        gcloud(
            "sql", "databases", "create", db,
            f"--instance={instance}",
            "--project", cfg.PROJECT,
        )


def _ensure_user_and_secret():
    from scripts.shell import run, run_ok as _run_ok
    import config as cfg  # re-import to get current values

    instance = cfg.db_instance_name()
    user     = cfg.db_user()
    secret   = cfg.SECRET_DB_PASSWORD

    # Check if secret already exists
    secret_exists = _run_ok(
        f"gcloud secrets describe {secret} --project {cfg.PROJECT}"
    )

    if secret_exists:
        print(f"  Secret '{secret}' already exists — reusing existing password.")
        # Read existing password
        password = run(
            ["gcloud", "secrets", "versions", "access", "latest",
             f"--secret={secret}", f"--project={cfg.PROJECT}"],
            capture=True,
        )
    else:
        password = _secrets.token_urlsafe(32)
        print(f"  Storing DB password in Secret Manager as '{secret}' …")
        run(
            ["gcloud", "secrets", "create", secret,
             "--replication-policy=automatic",
             f"--project={cfg.PROJECT}"],
            check=False,
        )
        run(
            ["gcloud", "secrets", "versions", "add", secret,
             f"--data-file=-", f"--project={cfg.PROJECT}"],
            input=password,
        )

    # Ensure the SQL user exists (may fail silently if already present)
    user_exists = _run_ok(
        f"gcloud sql users describe {user} --instance={instance} --project={cfg.PROJECT}"
    )
    if user_exists:
        print(f"  SQL user '{user}' already exists — updating password …")
        gcloud(
            "sql", "users", "set-password", user,
            f"--instance={instance}",
            f"--password={password}",
            "--project", cfg.PROJECT,
        )
    else:
        print(f"  Creating SQL user '{user}' …")
        gcloud(
            "sql", "users", "create", user,
            f"--instance={instance}",
            f"--password={password}",
            "--project", cfg.PROJECT,
        )

    return password


def get_db_private_ip() -> str:
    instance = cfg.db_instance_name()
    data = gcloud_json(
        "sql", "instances", "describe", instance,
        "--project", cfg.PROJECT,
    )
    for addr in data.get("ipAddresses", []):
        if addr.get("type") == "PRIVATE":
            return addr["ipAddress"]
    raise RuntimeError(f"No private IP found for Cloud SQL instance {instance}")


def deploy():
    _ensure_private_services_access()
    _ensure_instance()
    _ensure_database()
    _ensure_user_and_secret()
    ip = get_db_private_ip()
    print(f"  ✓ Cloud SQL ready — private IP: {ip}")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--project", required=True)
    p.add_argument("--region", default="us-central1")
    a = p.parse_args()
    cfg.PROJECT = a.project
    cfg.REGION  = a.region
    deploy()
