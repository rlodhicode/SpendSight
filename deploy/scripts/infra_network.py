"""
deploy/scripts/infra_network.py
Creates a custom VPC and a Serverless VPC Access connector so that
Cloud Run services can reach Cloud SQL and Memorystore (Redis) on
private IPs.
"""

from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config as cfg
from scripts.shell import gcloud, gcloud_json, run_ok


# CIDR range for the connector subnet — must not overlap any existing VPCs
CONNECTOR_CIDR = "10.8.0.0/28"


def _enable_apis():
    print("  Enabling required GCP APIs …")
    apis = [
        "run.googleapis.com",
        "sqladmin.googleapis.com",
        "redis.googleapis.com",
        "pubsub.googleapis.com",
        "storage.googleapis.com",
        "secretmanager.googleapis.com",
        "artifactregistry.googleapis.com",
        "aiplatform.googleapis.com",
        "vpcaccess.googleapis.com",
        "servicenetworking.googleapis.com",
        "cloudresourcemanager.googleapis.com",
    ]
    gcloud("services", "enable", *apis, "--project", cfg.PROJECT)


def _ensure_vpc():
    vpc = cfg.vpc_name()
    exists = run_ok(
        f"gcloud compute networks describe {vpc} --project {cfg.PROJECT}"
    )
    if exists:
        print(f"  VPC '{vpc}' already exists — skipping.")
        return
    print(f"  Creating VPC '{vpc}' …")
    gcloud(
        "compute", "networks", "create", vpc,
        "--subnet-mode=custom",
        "--bgp-routing-mode=regional",
        "--project", cfg.PROJECT,
    )


def _ensure_connector():
    conn = cfg.connector_name()
    vpc  = cfg.vpc_name()
    exists = run_ok(
        f"gcloud compute networks vpc-access connectors describe {conn}"
        f" --region {cfg.REGION} --project {cfg.PROJECT}"
    )
    if exists:
        print(f"  Connector '{conn}' already exists — skipping.")
        return
    print(f"  Creating Serverless VPC Access connector '{conn}' …")
    gcloud(
        "compute", "networks", "vpc-access", "connectors", "create", conn,
        f"--network={vpc}",
        f"--region={cfg.REGION}",
        f"--range={CONNECTOR_CIDR}",
        "--min-throughput=200",
        "--max-throughput=1000",
        "--project", cfg.PROJECT,
    )


def _ensure_firewall():
    """Allow Cloud Run / connector egress to reach SQL + Redis on private IPs."""
    rule = "spendsight-allow-internal"
    vpc  = cfg.vpc_name()
    exists = run_ok(
        f"gcloud compute firewall-rules describe {rule} --project {cfg.PROJECT}"
    )
    if exists:
        print(f"  Firewall rule '{rule}' already exists — skipping.")
        return
    print(f"  Creating firewall rule '{rule}' …")
    gcloud(
        "compute", "firewall-rules", "create", rule,
        f"--network={vpc}",
        "--direction=INGRESS",
        "--action=ALLOW",
        "--rules=tcp:5432,tcp:6379",
        "--source-ranges=10.8.0.0/28",
        "--project", cfg.PROJECT,
    )


def deploy():
    _enable_apis()
    _ensure_vpc()
    _ensure_connector()
    _ensure_firewall()
    print("  ✓ Network infrastructure ready.")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--project", required=True)
    p.add_argument("--region", default="us-central1")
    a = p.parse_args()
    cfg.PROJECT = a.project
    cfg.REGION  = a.region
    deploy()
