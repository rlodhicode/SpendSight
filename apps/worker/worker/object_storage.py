from pathlib import Path

from google.cloud import storage

from .config import settings


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


def _download_from_local_object(uri: str) -> tuple[bytes, str]:
    # local://<key> maps to UPLOAD_DIR/<key>; used for local dev.
    key = uri.replace("local://", "", 1)
    path = Path(settings.upload_dir) / key
    data = path.read_bytes()
    return data, path.name


def download_document(storage_uri: str) -> tuple[bytes, str]:
    if storage_uri.startswith("gs://"):
        return _download_from_gcs(storage_uri)
    if storage_uri.startswith("local://"):
        return _download_from_local_object(storage_uri)
    raise ValueError(f"Unsupported storage URI: {storage_uri}")

