#!/usr/bin/env python3
"""
SpendSight — deploy.py
Full GCP deployment orchestrator.

Usage:
    python deploy.py --project my-gcp-project --region us-central1

Prerequisites:
    gcloud CLI authenticated (`gcloud auth login && gcloud auth configure-docker`)
    APIs: run, sql, redis, pubsub, storage, secretmanager, artifactregistry, vpcaccess
"""

import argparse
import sys
from pathlib import Path

# Add scripts/ to path so sub-modules can be imported stand-alone too
sys.path.insert(0, str(Path(__file__).parent / "scripts"))

import config as cfg
from scripts.shell import run
from scripts import (
    infra_network,
    infra_pubsub,
    infra_sql,
    infra_redis,
    infra_storage,
    svc_api,
    svc_worker,
    svc_web,
    manage_secrets,
)


def parse_args():
    p = argparse.ArgumentParser(description="Deploy SpendSight to GCP")
    p.add_argument("--project", required=True, help="GCP project ID")
    p.add_argument("--region", default="us-central1", help="Primary GCP region")
    p.add_argument("--env", default="prod", help="Environment tag (prod/staging)")
    p.add_argument(
        "--skip",
        nargs="*",
        default=[],
        metavar="STEP",
        help="Steps to skip: network pubsub sql redis storage secrets api worker web",
    )
    return p.parse_args()


def banner(msg: str):
    width = 70
    print("\n" + "=" * width)
    print(f"  {msg}")
    print("=" * width)


def main():
    args = parse_args()
    skip = set(args.skip or [])

    # Populate shared config
    cfg.PROJECT = args.project
    cfg.REGION = args.region
    cfg.ENV = args.env

    banner(f"Deploying SpendSight → project={cfg.PROJECT}  region={cfg.REGION}")

    steps = [
        ("network",  "VPC / Serverless connector",  infra_network.deploy),
        ("pubsub",   "Pub/Sub topic + subscription", infra_pubsub.deploy),
        ("sql",      "Cloud SQL (Postgres)",          infra_sql.deploy),
        ("redis",    "Memorystore (Redis)",           infra_redis.deploy),
        ("storage",  "GCS bucket",                   infra_storage.deploy),
        ("secrets",  "Secret Manager entries",        manage_secrets.deploy),
        ("api",      "API — Cloud Run service",       svc_api.deploy),
        ("worker",   "Worker — Cloud Run service",    svc_worker.deploy),
        ("web",      "Web — Cloud Run service",       svc_web.deploy),
    ]

    for key, label, fn in steps:
        if key in skip:
            print(f"\n[SKIP] {label}")
            continue
        banner(label)
        fn()

    banner("Deployment complete!")
    _print_urls()


def _print_urls():
    import json
    for svc in ("spendsight-api", "spendsight-worker", "spendsight-web"):
        try:
            out = run(
                [
                    "gcloud", "run", "services", "describe", svc,
                    "--project", cfg.PROJECT,
                    "--region", cfg.REGION,
                    "--format", "json",
                ],
                capture=True,
                check=False,
            )
            data = json.loads(out)
            url = data["status"]["url"]
            print(f"  {svc:30s}  {url}")
        except Exception:
            pass


if __name__ == "__main__":
    main()
