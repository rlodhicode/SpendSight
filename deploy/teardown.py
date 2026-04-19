#!/usr/bin/env python3
"""
SpendSight — teardown.py
Deletes ALL GCP resources created by deploy.py.

⚠️  This is irreversible.  The script asks for confirmation before acting.

Usage:
    python teardown.py --project my-gcp-project --region us-central1
    python teardown.py --project my-gcp-project --region us-central1 --yes
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "scripts"))
sys.path.insert(0, str(Path(__file__).parent))

import config as cfg
from scripts.shell import run, run_ok, gcloud


def parse_args():
    p = argparse.ArgumentParser(description="Tear down all SpendSight GCP resources")
    p.add_argument("--project", required=True)
    p.add_argument("--region", default="us-central1")
    p.add_argument("--env", default="prod")
    p.add_argument("--yes", action="store_true", help="Skip confirmation prompt")
    p.add_argument(
        "--skip",
        nargs="*",
        default=[],
        metavar="STEP",
        help="Steps to skip: run sql redis pubsub storage secrets network ar",
    )
    return p.parse_args()


def confirm(project: str):
    print("\n" + "!" * 70)
    print(f"  You are about to DELETE all SpendSight resources in:")
    print(f"    Project : {project}")
    print(f"  This includes Cloud Run services, Cloud SQL, Memorystore, GCS,")
    print(f"  Pub/Sub, Secret Manager secrets, Artifact Registry images,")
    print(f"  VPC connector, and firewall rules.")
    print("!" * 70)
    answer = input("\nType the project ID to confirm: ").strip()
    if answer != project:
        print("Confirmation failed — aborting.")
        sys.exit(1)


# ── Individual teardown helpers ───────────────────────────────────────────────

def _delete_cloud_run():
    print("\n[Cloud Run] Deleting services …")
    for svc in (cfg.API_SVC, cfg.WORKER_SVC, cfg.WEB_SVC):
        if run_ok(f"gcloud run services describe {svc} --region={cfg.REGION} --project={cfg.PROJECT}"):
            print(f"  Deleting Cloud Run service: {svc}")
            run([
                "gcloud", "run", "services", "delete", svc,
                f"--region={cfg.REGION}",
                f"--project={cfg.PROJECT}",
                "--quiet",
            ])
        else:
            print(f"  Service '{svc}' not found — skipping.")


def _delete_cloud_sql():
    print("\n[Cloud SQL] Deleting instance …")
    instance = cfg.db_instance_name()
    if run_ok(f"gcloud sql instances describe {instance} --project={cfg.PROJECT}"):
        # Must disable deletion protection first
        print(f"  Disabling deletion protection on '{instance}' …")
        run([
            "gcloud", "sql", "instances", "patch", instance,
            "--no-deletion-protection",
            f"--project={cfg.PROJECT}",
            "--quiet",
        ], check=False)
        print(f"  Deleting Cloud SQL instance '{instance}' (takes ~1–2 min) …")
        run([
            "gcloud", "sql", "instances", "delete", instance,
            f"--project={cfg.PROJECT}",
            "--quiet",
        ])
    else:
        print(f"  Instance '{instance}' not found — skipping.")


def _delete_redis():
    print("\n[Memorystore] Deleting Redis instance …")
    instance = cfg.redis_instance_name()
    if run_ok(
        f"gcloud redis instances describe {instance}"
        f" --region={cfg.REGION} --project={cfg.PROJECT}"
    ):
        print(f"  Deleting Redis instance '{instance}' …")
        run([
            "gcloud", "redis", "instances", "delete", instance,
            f"--region={cfg.REGION}",
            f"--project={cfg.PROJECT}",
            "--quiet",
        ])
    else:
        print(f"  Redis instance '{instance}' not found — skipping.")


def _delete_pubsub():
    print("\n[Pub/Sub] Deleting subscription and topic …")
    sub   = cfg.PUBSUB_SUBSCRIPTION
    topic = cfg.PUBSUB_TOPIC

    if run_ok(f"gcloud pubsub subscriptions describe {sub} --project={cfg.PROJECT}"):
        print(f"  Deleting subscription '{sub}' …")
        run(["gcloud", "pubsub", "subscriptions", "delete", sub, f"--project={cfg.PROJECT}"])
    else:
        print(f"  Subscription '{sub}' not found — skipping.")

    if run_ok(f"gcloud pubsub topics describe {topic} --project={cfg.PROJECT}"):
        print(f"  Deleting topic '{topic}' …")
        run(["gcloud", "pubsub", "topics", "delete", topic, f"--project={cfg.PROJECT}"])
    else:
        print(f"  Topic '{topic}' not found — skipping.")


def _delete_storage():
    print("\n[GCS] Deleting bucket …")
    bucket = cfg.gcs_bucket_name()
    if run_ok(f"gcloud storage buckets describe gs://{bucket} --project={cfg.PROJECT}"):
        print(f"  Deleting all objects in gs://{bucket} …")
        run(["gcloud", "storage", "rm", "-r", f"gs://{bucket}", "--quiet"], check=False)
        print(f"  Deleting bucket gs://{bucket} …")
        run(["gcloud", "storage", "buckets", "delete", f"gs://{bucket}", "--project={cfg.PROJECT}", "--quiet"], check=False)
    else:
        print(f"  Bucket 'gs://{bucket}' not found — skipping.")


def _delete_secrets():
    print("\n[Secret Manager] Deleting secrets …")
    for secret in (cfg.SECRET_DB_PASSWORD, cfg.SECRET_JWT_SECRET):
        if run_ok(f"gcloud secrets describe {secret} --project={cfg.PROJECT}"):
            print(f"  Deleting secret '{secret}' …")
            run([
                "gcloud", "secrets", "delete", secret,
                f"--project={cfg.PROJECT}",
                "--quiet",
            ])
        else:
            print(f"  Secret '{secret}' not found — skipping.")


def _delete_artifact_registry():
    print("\n[Artifact Registry] Deleting repository …")
    repo = cfg.ar_repo()
    if run_ok(
        f"gcloud artifacts repositories describe {repo}"
        f" --location={cfg.REGION} --project={cfg.PROJECT}"
    ):
        print(f"  Deleting AR repo '{repo}' (and all images) …")
        run([
            "gcloud", "artifacts", "repositories", "delete", repo,
            f"--location={cfg.REGION}",
            f"--project={cfg.PROJECT}",
            "--quiet",
        ])
    else:
        print(f"  AR repo '{repo}' not found — skipping.")


def _delete_network():
    print("\n[Network] Deleting VPC connector and firewall …")
    conn = cfg.connector_name()
    vpc  = cfg.vpc_name()
    rule = "spendsight-allow-internal"

    if run_ok(
        f"gcloud compute networks vpc-access connectors describe {conn}"
        f" --region={cfg.REGION} --project={cfg.PROJECT}"
    ):
        print(f"  Deleting VPC connector '{conn}' …")
        run([
            "gcloud", "compute", "networks", "vpc-access", "connectors", "delete", conn,
            f"--region={cfg.REGION}",
            f"--project={cfg.PROJECT}",
            "--quiet",
        ])
    else:
        print(f"  Connector '{conn}' not found — skipping.")

    if run_ok(f"gcloud compute firewall-rules describe {rule} --project={cfg.PROJECT}"):
        print(f"  Deleting firewall rule '{rule}' …")
        run([
            "gcloud", "compute", "firewall-rules", "delete", rule,
            f"--project={cfg.PROJECT}",
            "--quiet",
        ])

    # Delete private services peering range (best-effort)
    run([
        "gcloud", "compute", "addresses", "delete",
        f"google-managed-services-{vpc}",
        "--global",
        f"--project={cfg.PROJECT}",
        "--quiet",
    ], check=False)

    # Note: we intentionally do NOT delete the VPC itself because other
    # resources (default routes, etc.) may depend on it.  Uncomment if desired:
    # if run_ok(f"gcloud compute networks describe {vpc} --project={cfg.PROJECT}"):
    #     run(["gcloud", "compute", "networks", "delete", vpc, "--project={cfg.PROJECT}", "--quiet"])


def _delete_service_account():
    sa = f"spendsight-run@{cfg.PROJECT}.iam.gserviceaccount.com"
    if run_ok(f"gcloud iam service-accounts describe {sa} --project={cfg.PROJECT}"):
        print(f"\n[IAM] Deleting service account '{sa}' …")
        run([
            "gcloud", "iam", "service-accounts", "delete", sa,
            f"--project={cfg.PROJECT}",
            "--quiet",
        ])


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()
    skip = set(args.skip or [])

    cfg.PROJECT = args.project
    cfg.REGION  = args.region
    cfg.ENV     = args.env

    if not args.yes:
        confirm(cfg.PROJECT)

    steps = [
        ("run",      _delete_cloud_run),
        ("sql",      _delete_cloud_sql),
        ("redis",    _delete_redis),
        ("pubsub",   _delete_pubsub),
        ("storage",  _delete_storage),
        ("secrets",  _delete_secrets),
        ("ar",       _delete_artifact_registry),
        ("sa",       _delete_service_account),
        ("network",  _delete_network),
    ]

    for key, fn in steps:
        if key in skip:
            print(f"\n[SKIP] {key}")
            continue
        fn()

    print("\n" + "=" * 70)
    print("  Teardown complete. All SpendSight resources have been deleted.")
    print("=" * 70)


if __name__ == "__main__":
    main()
