"""
deploy/scripts/infra_pubsub.py
Creates the Pub/Sub topic and pull subscription used by the worker.
"""

from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config as cfg
from scripts.shell import gcloud, run_ok


def _ensure_topic():
    topic = cfg.PUBSUB_TOPIC
    exists = run_ok(
        f"gcloud pubsub topics describe {topic} --project {cfg.PROJECT}"
    )
    if exists:
        print(f"  Topic '{topic}' already exists — skipping.")
        return
    print(f"  Creating Pub/Sub topic '{topic}' …")
    gcloud("pubsub", "topics", "create", topic, "--project", cfg.PROJECT)


def _ensure_subscription():
    sub   = cfg.PUBSUB_SUBSCRIPTION
    topic = cfg.PUBSUB_TOPIC
    exists = run_ok(
        f"gcloud pubsub subscriptions describe {sub} --project {cfg.PROJECT}"
    )
    if exists:
        print(f"  Subscription '{sub}' already exists — skipping.")
        return
    print(f"  Creating Pub/Sub subscription '{sub}' …")
    gcloud(
        "pubsub", "subscriptions", "create", sub,
        f"--topic={topic}",
        "--ack-deadline=60",
        "--message-retention-duration=7d",
        "--expiration-period=never",
        "--project", cfg.PROJECT,
    )


def deploy():
    _ensure_topic()
    _ensure_subscription()
    print("  ✓ Pub/Sub ready.")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--project", required=True)
    a = p.parse_args()
    cfg.PROJECT = a.project
    deploy()
