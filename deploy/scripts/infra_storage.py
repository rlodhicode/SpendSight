"""
deploy/scripts/infra_storage.py
Creates and configures the GCS bucket for bill document uploads.
"""

from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config as cfg
from scripts.shell import gcloud, run_ok


def _ensure_bucket():
    bucket = cfg.gcs_bucket_name()
    exists = run_ok(f"gcloud storage buckets describe gs://{bucket} --project={cfg.PROJECT}")
    if exists:
        print(f"  Bucket 'gs://{bucket}' already exists — skipping.")
        return
    print(f"  Creating GCS bucket 'gs://{bucket}' …")
    gcloud(
        "storage", "buckets", "create", f"gs://{bucket}",
        f"--location={cfg.REGION}",
        "--uniform-bucket-level-access",
        "--no-public-access-prevention",   # access controlled via IAM only
        "--project", cfg.PROJECT,
    )


def _set_lifecycle():
    """Apply a lifecycle policy: delete incomplete multipart uploads after 1 day."""
    import json, tempfile, os
    bucket = cfg.gcs_bucket_name()
    policy = {
        "rule": [
            {
                "action": {"type": "AbortIncompleteMultipartUpload"},
                "condition": {"age": 1},
            }
        ]
    }
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False
    ) as f:
        json.dump(policy, f)
        f.flush()
        gcloud(
            "storage", "buckets", "update", f"gs://{bucket}",
            f"--lifecycle-file={f.name}",
            "--project", cfg.PROJECT,
        )
    os.unlink(f.name)


def deploy():
    _ensure_bucket()
    _set_lifecycle()
    print(f"  ✓ GCS bucket ready: gs://{cfg.gcs_bucket_name()}")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--project", required=True)
    p.add_argument("--region", default="us-central1")
    a = p.parse_args()
    cfg.PROJECT = a.project
    cfg.REGION  = a.region
    deploy()
