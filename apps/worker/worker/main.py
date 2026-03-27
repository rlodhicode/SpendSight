import json
import logging
import time
from datetime import datetime

import redis

from .config import settings
from .database import BillRecord, Document, ProcessingJob, SessionLocal
from .extractor import mock_extract

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("spendsight-worker")

redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)


def set_job_status(job_id: str, status: str, error_message: str | None = None) -> None:
    payload = {"job_id": job_id, "status": status, "updated_at": datetime.utcnow().isoformat(), "error_message": error_message}
    redis_client.setex(f"job:{job_id}", settings.job_status_ttl_seconds, json.dumps(payload))


def invalidate_analytics_cache(user_id: str) -> None:
    cursor = 0
    pattern = f"analytics:{user_id}:*"
    while True:
        cursor, keys = redis_client.scan(cursor=cursor, match=pattern, count=100)
        if keys:
            redis_client.delete(*keys)
        if cursor == 0:
            break


def process_job(payload: dict) -> None:
    db = SessionLocal()
    job_id = payload["job_id"]
    document_id = payload["document_id"]
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        document = db.query(Document).filter(Document.id == document_id).first()
        if not job or not document:
            raise ValueError("Missing job or document")

        job.status = "processing"
        job.updated_at = datetime.utcnow()
        db.commit()
        set_job_status(job_id, "processing")

        extracted = mock_extract(document.storage_uri, document.utility_type)
        existing = db.query(BillRecord).filter(BillRecord.document_id == document.id).first()
        if not existing:
            bill = BillRecord(
                document_id=document.id,
                user_id=document.user_id,
                utility_type=document.utility_type,
                provider_name=extracted.provider_name,
                billing_period_start=extracted.billing_period_start,
                billing_period_end=extracted.billing_period_end,
                total_amount_due=extracted.total_amount_due,
                currency=extracted.currency,
                usage_kwh=extracted.usage_kwh,
                usage_gallons=extracted.usage_gallons,
                usage_therms=extracted.usage_therms,
                confidence_score=extracted.confidence_score,
            )
            db.add(bill)

        job.status = "completed"
        job.error_message = None
        job.updated_at = datetime.utcnow()
        db.commit()
        set_job_status(job_id, "completed")
        invalidate_analytics_cache(document.user_id)
        logger.info("Processed job %s", job_id)
    except Exception as exc:
        db.rollback()
        failed_job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if failed_job:
            failed_job.status = "failed"
            failed_job.error_message = str(exc)
            failed_job.updated_at = datetime.utcnow()
            db.commit()
        set_job_status(job_id, "failed", str(exc))
        logger.exception("Failed processing job %s", job_id)
    finally:
        db.close()


def main() -> None:
    logger.info("Worker started. Queue=%s", settings.queue_name)
    while True:
        try:
            item = redis_client.brpop(settings.queue_name, timeout=settings.poll_timeout_seconds)
            if item is None:
                continue
            _, raw = item
            payload = json.loads(raw)
            process_job(payload)
        except Exception:
            logger.exception("Worker loop error; sleeping briefly")
            time.sleep(2)


if __name__ == "__main__":
    main()

