"""
deploy/scripts/build.py
Builds and pushes Docker images to Artifact Registry.

Each service has its own Dockerfile under apps/<svc>/Dockerfile.
The repo root is used as the build context so that relative paths work.
"""

from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config as cfg
from scripts.shell import run, gcloud

# Assume repo root is two levels above this file: deploy/scripts/ → repo/
REPO_ROOT = Path(__file__).resolve().parents[2]


def image_tag(service: str, tag: str = "latest") -> str:
    return f"{cfg.image_base()}/{service}:{tag}"


def build_and_push(service: str, dockerfile_dir: str, tag: str = "latest"):
    """
    Build <dockerfile_dir>/Dockerfile and push to Artifact Registry.

    Args:
        service:        image name (e.g. 'spendsight-api')
        dockerfile_dir: path relative to repo root (e.g. 'apps/api')
        tag:            image tag (default 'latest')
    """
    full_tag   = image_tag(service, tag)
    build_path = REPO_ROOT / dockerfile_dir

    if not (build_path / "Dockerfile").exists():
        raise FileNotFoundError(f"Dockerfile not found at {build_path}/Dockerfile")

    print(f"  Building image '{full_tag}' …")

    # Configure Docker to authenticate to Artifact Registry
    gcloud(
        "auth", "configure-docker",
        f"{cfg.REGION}-docker.pkg.dev",
        "--quiet",
    )

    run(
        [
            "docker", "build",
            "-t", full_tag,
            "-f", str(build_path / "Dockerfile"),
            str(build_path),          # build context = service directory
        ]
    )

    print(f"  Pushing '{full_tag}' …")
    run(["docker", "push", full_tag])
    print(f"  ✓ Image pushed: {full_tag}")
    return full_tag
