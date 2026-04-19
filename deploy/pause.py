#!/usr/bin/env python3
"""
SpendSight — pause.py
Minimises ongoing GCP spend without destroying any data or config.

Actions taken:
  Cloud Run   → set --min-instances=0, --max-instances=0 (no traffic = no cost)
  Cloud SQL   → suspend the instance  (storage still billed, compute stops)
  Memorystore → no native pause — scales to minimum (already BASIC/1 GB)

Cost summary after pausing:
  • Cloud Run     : $0  (no requests = no billing)
  • Cloud SQL     : ~$0.01/GB-month storage only (compute stops)
  • Memorystore   : still billed at minimum tier (~$0.035/GB-hour)
  • Pub/Sub       : $0 (no messages)
  • GCS           : storage only (~$0.02/GB-month)

To resume:  python resume.py --project <project> --region <region>

Usage:
    python pause.py --project my-project --region us-central1
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "scripts"))
sys.path.insert(0, str(Path(__file__).parent))

import config as cfg
from scripts.shell import run, run_ok


def parse_args():
    p = argparse.ArgumentParser(description="Pause SpendSight to minimise GCP spend")
    p.add_argument("--project", required=True)
    p.add_argument("--region", default="us-central1")
    p.add_argument("--env", default="prod")
    p.add_argument(
        "--skip",
        nargs="*",
        default=[],
        metavar="STEP",
        help="Steps to skip: run sql redis",
    )
    return p.parse_args()


def _pause_cloud_run():
    print("\n[Cloud Run] Scaling all services to zero …")
    # Scale to max=0 means no instances run even if traffic arrives
    # (Cloud Run will return 429 / service unavailable until resumed)
    for svc in (cfg.API_SVC, cfg.WORKER_SVC, cfg.WEB_SVC):
        if run_ok(
            f"gcloud run services describe {svc}"
            f" --region={cfg.REGION} --project={cfg.PROJECT}"
        ):
            print(f"  Pausing '{svc}' (min=0, max=0) …")
            run([
                "gcloud", "run", "services", "update", svc,
                "--min-instances=0",
                "--max-instances=0",
                f"--region={cfg.REGION}",
                f"--project={cfg.PROJECT}",
            ])
        else:
            print(f"  Service '{svc}' not found — skipping.")
    print("  ✓ Cloud Run services scaled to zero.")


def _pause_cloud_sql():
    print("\n[Cloud SQL] Suspending instance …")
    instance = cfg.db_instance_name()
    if run_ok(f"gcloud sql instances describe {instance} --project={cfg.PROJECT}"):
        print(f"  Suspending Cloud SQL instance '{instance}' …")
        run([
            "gcloud", "sql", "instances", "patch", instance,
            "--activation-policy=NEVER",
            f"--project={cfg.PROJECT}",
            "--quiet",
        ])
        print("  ✓ Cloud SQL compute stopped (storage still billed).")
    else:
        print(f"  Instance '{instance}' not found — skipping.")


def _pause_redis():
    print("\n[Memorystore] Note: Redis BASIC tier cannot be paused.")
    print("  Redis continues to be billed (~$0.035/GB-hr).")
    print("  To eliminate Redis cost entirely, run teardown.py with --skip run sql pubsub storage secrets ar network.")
    print("  The instance and its data will be lost if deleted.")


def main():
    args = parse_args()
    skip = set(args.skip or [])

    cfg.PROJECT = args.project
    cfg.REGION  = args.region
    cfg.ENV     = args.env

    print(f"\nPausing SpendSight → project={cfg.PROJECT}  region={cfg.REGION}")

    if "run" not in skip:
        _pause_cloud_run()
    if "sql" not in skip:
        _pause_cloud_sql()
    if "redis" not in skip:
        _pause_redis()

    print("\n" + "=" * 70)
    print("  SpendSight paused.")
    print("  Run:  python resume.py --project", cfg.PROJECT, "--region", cfg.REGION)
    print("  to bring everything back online.")
    print("=" * 70)


if __name__ == "__main__":
    main()
