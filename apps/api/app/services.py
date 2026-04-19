from __future__ import annotations
from typing import Optional
import json
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import redis
from fastapi import UploadFile
from google.cloud import storage
from sqlalchemy.orm import Session

from .config import settings
from .events import ProcessingEvent
from .models import UtilityIdSequence
from .queueing import QueuePublisher, get_queue_publisher

redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
queue_publisher: QueuePublisher | None = None

UTILITY_PREFIX_MAP = {
    "electric": "E",
    "electricity": "E",
    "water": "W",
    "gas": "G",
    "waste": "T",
    "internet": "I",
}


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


def _download_from_gcs(uri: str) -> tuple[bytes, str]:
    if not uri.startswith("gs://"):
        raise ValueError(f"Expected gs:// URI, received: {uri}")
    body = uri[5:]
    bucket_name, _, key = body.partition("/")
    if not bucket_name or not key:
        raise ValueError(f"Invalid GCS URI: {uri}")

    client = storage.Client(project=settings.gcp_project_id or None)
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(key)
    data = blob.download_as_bytes()
    filename = Path(key).name
    return data, filename


def _download_from_local(uri: str) -> tuple[bytes, str]:
    if not uri.startswith("local://"):
        raise ValueError(f"Expected local:// URI, received: {uri}")
    key = uri.replace("local://", "", 1)
    path = Path(settings.upload_dir) / key
    if not path.exists():
        raise FileNotFoundError(f"Local object not found: {key}")
    return path.read_bytes(), path.name


def download_storage_object(storage_uri: str) -> tuple[bytes, str]:
    if storage_uri.startswith("gs://"):
        return _download_from_gcs(storage_uri)
    if storage_uri.startswith("local://"):
        return _download_from_local(storage_uri)
    raise ValueError(f"Unsupported storage URI: {storage_uri}")


def enqueue_job(event: ProcessingEvent) -> None:
    global queue_publisher
    if queue_publisher is None:
        queue_publisher = get_queue_publisher(redis_client)
    queue_publisher.publish(event)


def get_utility_prefix(utility_type: str | None) -> str:
    if not utility_type:
        return "U"
    return UTILITY_PREFIX_MAP.get(utility_type.strip().lower(), "U")


def next_public_id(db: Session, utility_type: str | None) -> str:
    prefix = get_utility_prefix(utility_type)
    sequence = (
        db.query(UtilityIdSequence)
        .filter(UtilityIdSequence.utility_prefix == prefix)
        .with_for_update()
        .first()
    )
    if not sequence:
        sequence = UtilityIdSequence(utility_prefix=prefix, next_value=1)
        db.add(sequence)
        db.flush()
    value = sequence.next_value
    sequence.next_value += 1
    db.flush()
    return f"{prefix}{value:05d}"


def set_job_status(
    job_id: str,
    status: str,
    error_message: Optional[str] = None,
    review_required: bool = False,
    review_status: Optional[str] = None,
) -> None:
    payload = {
        "job_id": job_id,
        "status": status,
        "updated_at": datetime.utcnow().isoformat(),
        "error_message": error_message,
        "review_required": review_required,
        "review_status": review_status,
    }
    redis_client.setex(f"job:{job_id}", settings.job_status_ttl_seconds, json.dumps(payload))



