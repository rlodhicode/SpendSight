import json
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import redis
from fastapi import UploadFile

from .config import settings


redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)


def save_upload(user_id: str, upload: UploadFile) -> str:
    now = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    path = Path(settings.upload_dir) / user_id
    path.mkdir(parents=True, exist_ok=True)
    name = f"{now}_{uuid4()}_{upload.filename}"
    full_path = path / name
    with full_path.open("wb") as outfile:
        outfile.write(upload.file.read())
    return str(full_path.resolve())


def enqueue_job(payload: dict) -> None:
    redis_client.lpush(settings.queue_name, json.dumps(payload))


def set_job_status(job_id: str, status: str, error_message: str | None = None) -> None:
    payload = {"job_id": job_id, "status": status, "updated_at": datetime.utcnow().isoformat(), "error_message": error_message}
    redis_client.setex(f"job:{job_id}", settings.job_status_ttl_seconds, json.dumps(payload))

