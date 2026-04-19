"""
deploy/scripts/infra_redis.py
Provisions a Memorystore for Redis BASIC instance on the private VPC.
Cloud Run services reach it via the Serverless VPC Access connector.
"""

from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config as cfg
from scripts.shell import gcloud, gcloud_json, run_ok


def _ensure_instance():
    instance = cfg.redis_instance_name()
    vpc      = cfg.vpc_name()

    exists = run_ok(
        f"gcloud redis instances describe {instance}"
        f" --region={cfg.REGION} --project={cfg.PROJECT}"
    )
    if exists:
        print(f"  Redis instance '{instance}' already exists — skipping.")
        return

    print(f"  Creating Memorystore Redis instance '{instance}' (takes ~3 min) …")
    gcloud(
        "redis", "instances", "create", instance,
        f"--size={cfg.REDIS_MEMORY_GB}",
        f"--region={cfg.REGION}",
        f"--tier={cfg.REDIS_TIER}",
        f"--network=projects/{cfg.PROJECT}/global/networks/{vpc}",
        "--redis-version=redis_7_0",
        "--project", cfg.PROJECT,
    )


def get_redis_host() -> str:
    instance = cfg.redis_instance_name()
    data = gcloud_json(
        "redis", "instances", "describe", instance,
        f"--region={cfg.REGION}",
        "--project", cfg.PROJECT,
    )
    return data["host"]


def get_redis_port() -> int:
    instance = cfg.redis_instance_name()
    data = gcloud_json(
        "redis", "instances", "describe", instance,
        f"--region={cfg.REGION}",
        "--project", cfg.PROJECT,
    )
    return int(data.get("port", 6379))


def get_redis_url() -> str:
    host = get_redis_host()
    port = get_redis_port()
    return f"redis://{host}:{port}/0"


def deploy():
    _ensure_instance()
    url = get_redis_url()
    print(f"  ✓ Redis ready — {url}")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--project", required=True)
    p.add_argument("--region", default="us-central1")
    a = p.parse_args()
    cfg.PROJECT = a.project
    cfg.REGION  = a.region
    deploy()
