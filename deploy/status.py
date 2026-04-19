#!/usr/bin/env python3
"""
SpendSight — status.py
Prints a quick health summary of all deployed resources.

Usage:
    python status.py --project my-project --region us-central1
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "scripts"))
sys.path.insert(0, str(Path(__file__).parent))

import config as cfg
from scripts.shell import run, run_ok


def parse_args():
    p = argparse.ArgumentParser(description="SpendSight deployment status")
    p.add_argument("--project", required=True)
    p.add_argument("--region", default="us-central1")
    p.add_argument("--env", default="prod")
    return p.parse_args()


def _cloud_run_status():
    print("\n── Cloud Run ──────────────────────────────────────────")
    for svc in (cfg.API_SVC, cfg.WORKER_SVC, cfg.WEB_SVC):
        try:
            raw = run([
                "gcloud", "run", "services", "describe", svc,
                f"--region={cfg.REGION}",
                f"--project={cfg.PROJECT}",
                "--format=json",
            ], capture=True, check=True)
            data   = json.loads(raw)
            url    = data["status"].get("url", "n/a")
            ready  = next(
                (c for c in data["status"].get("conditions", []) if c["type"] == "Ready"),
                {},
            )
            status = "✓ Ready" if ready.get("status") == "True" else "✗ " + ready.get("reason", "Unknown")
            print(f"  {svc:30s}  {status:18s}  {url}")
        except SystemExit:
            print(f"  {svc:30s}  — not found")


def _sql_status():
    print("\n── Cloud SQL ───────────────────────────────────────────")
    instance = cfg.db_instance_name()
    try:
        raw = run([
            "gcloud", "sql", "instances", "describe", instance,
            f"--project={cfg.PROJECT}",
            "--format=json",
        ], capture=True, check=True)
        data   = json.loads(raw)
        state  = data.get("state", "UNKNOWN")
        policy = data.get("settings", {}).get("activationPolicy", "?")
        ip     = next(
            (a["ipAddress"] for a in data.get("ipAddresses", []) if a["type"] == "PRIVATE"),
            "no private IP",
        )
        print(f"  {instance:30s}  {state:12s}  policy={policy}  ip={ip}")
    except SystemExit:
        print(f"  {instance:30s}  — not found")


def _redis_status():
    print("\n── Memorystore (Redis) ──────────────────────────────────")
    instance = cfg.redis_instance_name()
    try:
        raw = run([
            "gcloud", "redis", "instances", "describe", instance,
            f"--region={cfg.REGION}",
            f"--project={cfg.PROJECT}",
            "--format=json",
        ], capture=True, check=True)
        data  = json.loads(raw)
        state = data.get("state", "UNKNOWN")
        host  = data.get("host", "?")
        port  = data.get("port", "?")
        print(f"  {instance:30s}  {state:12s}  {host}:{port}")
    except SystemExit:
        print(f"  {instance:30s}  — not found")


def _pubsub_status():
    print("\n── Pub/Sub ──────────────────────────────────────────────")
    for kind, name in [("topic", cfg.PUBSUB_TOPIC), ("subscription", cfg.PUBSUB_SUBSCRIPTION)]:
        exists = run_ok(f"gcloud pubsub {kind}s describe {name} --project={cfg.PROJECT}")
        sym = "✓" if exists else "✗"
        print(f"  {sym}  {kind:16s}  {name}")


def _storage_status():
    print("\n── GCS Bucket ───────────────────────────────────────────")
    bucket = cfg.gcs_bucket_name()
    try:
        raw = run([
            "gcloud", "storage", "buckets", "describe", f"gs://{bucket}",
            f"--project={cfg.PROJECT}",
            "--format=json",
        ], capture=True, check=True)
        data = json.loads(raw)
        location = data.get("location", "?")
        print(f"  ✓  gs://{bucket}  ({location})")
    except SystemExit:
        print(f"  ✗  gs://{bucket}  — not found")


def main():
    args = parse_args()
    cfg.PROJECT = args.project
    cfg.REGION  = args.region
    cfg.ENV     = args.env

    print(f"\nSpendSight Status — project={cfg.PROJECT}  region={cfg.REGION}")
    _cloud_run_status()
    _sql_status()
    _redis_status()
    _pubsub_status()
    _storage_status()
    print()


if __name__ == "__main__":
    main()
