#!/usr/bin/env python3
"""
SpendSight — resume.py
Reverses the actions of pause.py, bringing SpendSight back online.

Usage:
    python resume.py --project my-project --region us-central1
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "scripts"))
sys.path.insert(0, str(Path(__file__).parent))

import config as cfg
from scripts.shell import run, run_ok


def parse_args():
    p = argparse.ArgumentParser(description="Resume SpendSight after pausing")
    p.add_argument("--project", required=True)
    p.add_argument("--region", default="us-central1")
    p.add_argument("--env", default="prod")
    p.add_argument(
        "--skip",
        nargs="*",
        default=[],
        metavar="STEP",
        help="Steps to skip: run sql",
    )
    return p.parse_args()


def _resume_cloud_sql():
    print("\n[Cloud SQL] Resuming instance …")
    instance = cfg.db_instance_name()
    if run_ok(f"gcloud sql instances describe {instance} --project={cfg.PROJECT}"):
        print(f"  Starting Cloud SQL instance '{instance}' …")
        run([
            "gcloud", "sql", "instances", "patch", instance,
            "--activation-policy=ALWAYS",
            f"--project={cfg.PROJECT}",
            "--quiet",
        ])
        print("  ✓ Cloud SQL instance running.")
    else:
        print(f"  Instance '{instance}' not found — skipping.")


def _resume_cloud_run():
    print("\n[Cloud Run] Restoring service scaling …")
    # Worker needs min=1 so it can poll Pub/Sub continuously
    configs = {
        cfg.API_SVC:    {"min": 0, "max": 10},
        cfg.WORKER_SVC: {"min": 1, "max": 5},
        cfg.WEB_SVC:    {"min": 0, "max": 5},
    }
    for svc, scale in configs.items():
        if run_ok(
            f"gcloud run services describe {svc}"
            f" --region={cfg.REGION} --project={cfg.PROJECT}"
        ):
            print(f"  Resuming '{svc}' (min={scale['min']}, max={scale['max']}) …")
            run([
                "gcloud", "run", "services", "update", svc,
                f"--min-instances={scale['min']}",
                f"--max-instances={scale['max']}",
                f"--region={cfg.REGION}",
                f"--project={cfg.PROJECT}",
            ])
        else:
            print(f"  Service '{svc}' not found — skipping.")
    print("  ✓ Cloud Run services resumed.")


def _print_urls():
    import json
    print("\n  Service URLs:")
    for svc in (cfg.API_SVC, cfg.WEB_SVC):
        try:
            raw = run([
                "gcloud", "run", "services", "describe", svc,
                f"--region={cfg.REGION}",
                f"--project={cfg.PROJECT}",
                "--format=json",
            ], capture=True, check=False)
            url = json.loads(raw)["status"]["url"]
            print(f"    {svc:30s}  {url}")
        except Exception:
            pass


def main():
    args = parse_args()
    skip = set(args.skip or [])

    cfg.PROJECT = args.project
    cfg.REGION  = args.region
    cfg.ENV     = args.env

    print(f"\nResuming SpendSight → project={cfg.PROJECT}  region={cfg.REGION}")

    # SQL must come up before Cloud Run services start taking traffic
    if "sql" not in skip:
        _resume_cloud_sql()
    if "run" not in skip:
        _resume_cloud_run()

    _print_urls()

    print("\n" + "=" * 70)
    print("  SpendSight resumed and ready.")
    print("=" * 70)


if __name__ == "__main__":
    main()
