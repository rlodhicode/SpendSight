from __future__ import annotations
from typing import Optional
import json
import logging
import os
import threading
import time
from datetime import datetime
from decimal import Decimal

import redis
from fastapi import FastAPI, HTTPException, Request, status

from .config import settings
from .database import BillFieldConfidence, BillRecord, Document, ProcessingJob, SessionLocal
from .events import ProcessingEvent
from .llm_extractor import VertexGeminiExtractor
from .object_storage import download_document
from .queueing import PubSubQueueConsumer, RedisQueueConsumer, parse_pubsub_push
from .review import compute_weighted_overall_confidence, has_missing_required_fields, needs_human_review

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("spendsight-worker")

redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
extractor = VertexGeminiExtractor()
app = FastAPI(title="SpendSight Worker", version="0.2.0")
_worker_loop_lock = threading.Lock()
_worker_loop_thread: threading.Thread | None = None


def set_job_status(
    job_id: str,
    status_value: str,
    error_message: Optional[str] = None,
    review_required: bool = False,
    review_status: Optional[str] = None,
) -> None:
    payload = {
        "job_id": job_id,
        "status": status_value,
        "updated_at": datetime.utcnow().isoformat(),
        "error_message": error_message,
        "review_required": review_required,
        "review_status": review_status,
    }
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


def _field_value(extracted, field_name: str) -> Optional[str]:
    lookups = {
        "header.provider_name": extracted.header.provider_name,
        "header.account_number": extracted.header.account_number,
        "header.utility_type": extracted.header.utility_type,
        "header.due_date": extracted.header.due_date,
        "header.billing_period.start_date": extracted.header.billing_period.start_date,
        "header.billing_period.end_date": extracted.header.billing_period.end_date,
        "financials.total_amount_due": extracted.financials.total_amount_due,
        "usage.amount": extracted.usage.amount,
        "usage.unit": extracted.usage.unit,
    }
    value = lookups.get(field_name)
    return None if value is None else str(value)


def _upsert_bill_record(db, document: Document, extracted_doc, review_required: bool, review_status: str) -> BillRecord:
    extracted = extracted_doc.extracted
    usage_amount = extracted.usage.amount
    usage_unit = extracted.usage.unit
    usage_kwh = usage_amount if usage_unit == "kWh" else None
    usage_gallons = usage_amount if usage_unit == "Gallons" else None
    usage_therms = usage_amount if usage_unit == "Therms" else None
    mapped_utility_type = extracted.header.utility_type or document.utility_type
    total_amount_due = extracted.financials.total_amount_due or 0.0
    existing = db.query(BillRecord).filter(BillRecord.document_id == document.id).first()
    if existing:
        return existing

    bill = BillRecord(
        document_id=document.id,
        public_id=document.public_id,
        user_id=document.user_id,
        utility_type=mapped_utility_type,
        provider_name=extracted.header.provider_name or "Unknown Provider",
        account_number=extracted.header.account_number,
        billing_period_start=extracted.header.billing_period.start_date or datetime.utcnow().date(),
        billing_period_end=extracted.header.billing_period.end_date or datetime.utcnow().date(),
        due_date=extracted.header.due_date,
        total_amount_due=Decimal(str(total_amount_due)),
        currency="USD",
        usage_amount=usage_amount,
        usage_unit=usage_unit,
        usage_kwh=usage_kwh,
        usage_gallons=usage_gallons,
        usage_therms=usage_therms,
        previous_balance=extracted.financials.previous_balance,
        payments_credits=extracted.financials.payments_credits,
        current_charges=extracted.financials.current_charges,
        adjustments_json=[item.model_dump() for item in extracted.financials.adjustments],
        line_items_json=[item.model_dump() for item in extracted.line_items],
        meter_readings_json=[item.model_dump() for item in extracted.usage.meter_readings],
        raw_extraction_json=extracted.model_dump(mode="json"),
        confidence_score=extracted_doc.overall_confidence,
        overall_confidence=extracted_doc.overall_confidence,
        review_required=review_required,
        review_status=review_status,
    )
    db.add(bill)
    db.flush()
    for confidence in extracted_doc.field_confidences:
        db.add(
            BillFieldConfidence(
                bill_record_id=bill.id,
                field_name=confidence.field_name,
                field_value=_field_value(extracted, confidence.field_name),
                confidence_score=confidence.confidence_score,
                source=confidence.source,
            )
        )
    return bill


def process_event(event: ProcessingEvent) -> str:
    db = SessionLocal()
    job_id = event.job_id
    document_id = event.document_id
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        document = db.query(Document).filter(Document.id == document_id).first()
        if not job or not document:
            raise ValueError("Missing job or document")

        # Idempotent skip for already-finalized jobs.
        if job.status in {"completed", "needs_review"}:
            logger.info("Skipping already finalized job %s", job_id)
            return job.status

        job.status = "processing"
        job.updated_at = datetime.utcnow()
        db.commit()
        set_job_status(job_id, "processing")

        file_bytes, filename = download_document(document.storage_uri)
        extracted_doc = extractor.extract(file_bytes, filename)
        extracted_doc.overall_confidence = compute_weighted_overall_confidence(extracted_doc)
        missing_required = has_missing_required_fields(extracted_doc)
        review_required = needs_human_review(extracted_doc, settings.extraction_confidence_threshold)
        if missing_required:
            review_required = True
        review_status = "needs_review" if review_required else "not_required"
        _upsert_bill_record(db, document, extracted_doc, review_required, review_status)

        job.status = "needs_review" if review_required else "completed"
        job.error_message = None
        job.updated_at = datetime.utcnow()
        db.commit()
        set_job_status(job_id, job.status, review_required=review_required, review_status=review_status)
        invalidate_analytics_cache(document.user_id)
        logger.info("Processed job %s status=%s", job_id, job.status)
        return job.status
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
        raise
    finally:
        db.close()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/pubsub/push")
async def pubsub_push(request: Request) -> dict[str, str]:
    payload = await request.json()
    try:
        event = parse_pubsub_push(payload)
        process_event(event)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    return {"status": "accepted"}


def run_local_worker_loop() -> None:
    if settings.queue_provider.lower() == "pubsub":
        consumer = PubSubQueueConsumer()
        logger.info(
            "Worker started. Provider=pubsub Subscription=%s Topic=%s",
            settings.pubsub_subscription,
            settings.pubsub_topic,
        )
    else:
        consumer = RedisQueueConsumer(redis_client)
        logger.info("Worker started. Provider=redis Queue=%s", settings.queue_name)
    while True:
        try:
            event = consumer.pull()
            if event is None:
                continue
            process_event(event)
        except Exception:
            logger.exception("Worker loop error; sleeping briefly")
            time.sleep(2)


def _start_worker_loop_in_background() -> None:
    global _worker_loop_thread
    with _worker_loop_lock:
        if _worker_loop_thread and _worker_loop_thread.is_alive():
            return
        _worker_loop_thread = threading.Thread(
            target=run_local_worker_loop,
            name="spendsight-worker-loop",
            daemon=True,
        )
        _worker_loop_thread.start()
        logger.info("Worker polling loop started in background thread.")


@app.on_event("startup")
def startup_worker_loop() -> None:
    if os.getenv("WORKER_LOOP_ENABLED", "true").strip().lower() != "true":
        logger.info("WORKER_LOOP_ENABLED is false; background loop will not start.")
        return
    _start_worker_loop_in_background()


if __name__ == "__main__":
    run_local_worker_loop()




