import json
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import redis
from fastapi import UploadFile
from google.cloud import storage

from .config import settings

redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)


class StorageClient:
    def upload(self, user_id: str, upload: UploadFile) -> str:
        raise NotImplementedError


class LocalObjectStorage(StorageClient):
    def upload(self, user_id: str, upload: UploadFile) -> str:
        now = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        key = f"{user_id}/{now}_{uuid4()}_{upload.filename}"
        path = Path(settings.upload_dir) / key
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("wb") as outfile:
            outfile.write(upload.file.read())
        return f"local://{key}"


class GCSStorage(StorageClient):
    def __init__(self) -> None:
        if not settings.gcs_bucket:
            raise ValueError("GCS_BUCKET must be set when STORAGE_PROVIDER=gcs")
        self.bucket_name = settings.gcs_bucket
        self.client = storage.Client(project=settings.gcp_project_id or None)

    def upload(self, user_id: str, upload: UploadFile) -> str:
        now = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        key = f"{user_id}/{now}_{uuid4()}_{upload.filename}"
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(key)
        blob.upload_from_file(upload.file, content_type=upload.content_type)
        return f"gs://{self.bucket_name}/{key}"


def get_storage_client() -> StorageClient:
    if settings.storage_provider.lower() == "gcs":
        return GCSStorage()
    return LocalObjectStorage()


storage_client = get_storage_client()


def save_upload(user_id: str, upload: UploadFile) -> str:
    return storage_client.upload(user_id, upload)


def enqueue_job(payload: dict) -> None:
    redis_client.lpush(settings.queue_name, json.dumps(payload))


def set_job_status(job_id: str, status: str, error_message: str | None = None) -> None:
    payload = {"job_id": job_id, "status": status, "updated_at": datetime.utcnow().isoformat(), "error_message": error_message}
    redis_client.setex(f"job:{job_id}", settings.job_status_ttl_seconds, json.dumps(payload))

