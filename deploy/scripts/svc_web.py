"""
deploy/scripts/svc_web.py
Builds the React/Vite frontend image and deploys it to Cloud Run.

After the API is deployed we inject the API URL as VITE_API_BASE_URL
into a build-time .env so Vite bakes it into the static bundle.  The
Nginx container then serves the static files on port 8080 (Cloud Run's
expected port).

If you want a separate CDN (Cloud Storage + Cloud CDN), replace the
Cloud Run deploy with a `gcloud storage cp` + CDN setup.  For most
projects Cloud Run is simpler.
"""

from __future__ import annotations
import json
import sys
import tempfile
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config as cfg
from scripts.shell import run, gcloud, run_ok
from scripts.build import image_tag
from scripts import manage_secrets as sec_module

REPO_ROOT = Path(__file__).resolve().parents[2]


def _get_api_url() -> str:
    try:
        raw = gcloud(
            "run", "services", "describe", cfg.API_SVC,
            f"--region={cfg.REGION}",
            f"--project={cfg.PROJECT}",
            "--format=json",
            capture=True,
        )
        return json.loads(raw)["status"]["url"]
    except (SystemExit, Exception):
        return "http://localhost:8000"


def _build_web_image(api_url: str) -> str:
    """
    Build the web image with VITE_API_BASE_URL baked in at build time.
    We write a temporary .env file into apps/web before running docker build.
    """
    web_dir  = REPO_ROOT / "apps" / "web"
    env_file = web_dir / ".env"
    tag      = image_tag("spendsight-web", "latest")

    print(f"  Injecting VITE_API_BASE_URL={api_url} into apps/web/.env …")
    env_file.write_text(f"VITE_API_BASE_URL={api_url}\n")

    # Configure Docker → AR auth
    gcloud(
        "auth", "configure-docker",
        f"{cfg.REGION}-docker.pkg.dev",
        "--quiet",
    )

    print(f"  Building web image '{tag}' …")
    run([
        "docker", "build",
        "-t", tag,
        "-f", str(web_dir / "Dockerfile"),
        str(web_dir),
    ])

    # Clean up the generated .env so it isn't committed
    env_file.unlink(missing_ok=True)

    print(f"  Pushing web image …")
    run(["docker", "push", tag])
    return tag


def deploy():
    sa   = sec_module.get_sa_email()
    api_url = _get_api_url()
    image   = _build_web_image(api_url)

    print(f"  Deploying Web to Cloud Run ({cfg.WEB_SVC}) …")
    run([
        "gcloud", "run", "deploy", cfg.WEB_SVC,
        f"--image={image}",
        f"--region={cfg.REGION}",
        "--platform=managed",
        "--allow-unauthenticated",
        f"--service-account={sa}",
        "--min-instances=0",
        "--max-instances=5",
        "--memory=256Mi",
        "--cpu=1",
        "--concurrency=80",
        "--timeout=30",
        f"--project={cfg.PROJECT}",
    ])

    # Retrieve the web URL for output.
    web_url = _get_web_url()
    print(f"  ✓ Web deployed → {web_url}")
    return web_url


def _get_web_url() -> str:
    raw = gcloud(
        "run", "services", "describe", cfg.WEB_SVC,
        f"--region={cfg.REGION}",
        f"--project={cfg.PROJECT}",
        "--format=json",
        capture=True,
    )
    return json.loads(raw)["status"]["url"]


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--project", required=True)
    p.add_argument("--region", default="us-central1")
    a = p.parse_args()
    cfg.PROJECT = a.project
    cfg.REGION  = a.region
    deploy()
