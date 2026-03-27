from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from pathlib import Path

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import BillRecord, Document, ProcessingJob, User
from ..schemas import BillRecordResponse, UploadResponse
from ..services import enqueue_job, save_upload, set_job_status

router = APIRouter(prefix="/bills", tags=["bills"])


@router.post("/upload", response_model=UploadResponse)
def upload_bill(
    utility_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in settings.allowed_upload_extensions_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(settings.allowed_upload_extensions_list)}",
        )

    storage_uri = save_upload(user.id, file)

    document = Document(
        user_id=user.id,
        filename=file.filename or "unknown",
        content_type=file.content_type,
        utility_type=utility_type,
        storage_uri=storage_uri,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    job = ProcessingJob(document_id=document.id, status="queued")
    db.add(job)
    db.commit()
    db.refresh(job)

    payload = {"job_id": job.id, "document_id": document.id, "user_id": user.id}
    enqueue_job(payload)
    set_job_status(job.id, "queued")

    return UploadResponse(document_id=document.id, job_id=job.id, status=job.status)


@router.get("", response_model=list[BillRecordResponse])
def list_bills(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        db.query(BillRecord)
        .filter(BillRecord.user_id == user.id)
        .order_by(BillRecord.billing_period_end.desc())
        .all()
    )
    return [
        BillRecordResponse(
            id=row.id,
            utility_type=row.utility_type,
            provider_name=row.provider_name,
            account_number=row.account_number,
            billing_period_start=row.billing_period_start,
            billing_period_end=row.billing_period_end,
            due_date=row.due_date,
            total_amount_due=float(row.total_amount_due),
            currency=row.currency,
            usage_amount=row.usage_amount,
            usage_unit=row.usage_unit,
            usage_kwh=row.usage_kwh,
            usage_gallons=row.usage_gallons,
            usage_therms=row.usage_therms,
            previous_balance=row.previous_balance,
            payments_credits=row.payments_credits,
            current_charges=row.current_charges,
            adjustments_json=row.adjustments_json,
            line_items_json=row.line_items_json,
            meter_readings_json=row.meter_readings_json,
            raw_extraction_json=row.raw_extraction_json,
            confidence_score=row.confidence_score,
            extracted_at=row.extracted_at,
        )
        for row in rows
    ]
