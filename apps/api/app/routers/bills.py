import mimetypes
from datetime import date, datetime
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..events import ProcessingEvent
from ..models import BillRecord, BillReviewEdit, Document, ProcessingJob, User
from ..schemas import (
    BillDetailResponse,
    BillRecordResponse,
    BillUpdateRequest,
    DocumentMetadataResponse,
    PaginatedBillsResponse,
    ReviewEditResponse,
    UploadResponse,
)
from ..services import (
    download_storage_object,
    enqueue_job,
    next_public_id,
    redis_client,
    save_upload,
    set_job_status,
)

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
        public_id=next_public_id(db, utility_type),
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

    event = ProcessingEvent(
        trace_id=str(uuid4()),
        job_id=job.id,
        document_id=document.id,
        user_id=user.id,
        storage_uri=document.storage_uri,
        uploaded_at=document.uploaded_at,
    )
    enqueue_job(event)
    set_job_status(job.id, "queued", review_required=False, review_status="not_required")

    return UploadResponse(document_id=document.id, job_id=job.id, status=job.status)


def _serialize_bill(row: BillRecord) -> BillRecordResponse:
    return BillRecordResponse(
        id=row.id,
        public_id=row.public_id or row.id,
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
        overall_confidence=row.overall_confidence,
        review_required=row.review_required,
        review_status=row.review_status or "not_required",
        reviewed_at=row.reviewed_at,
        reviewed_by=row.reviewed_by,
        extracted_at=row.extracted_at,
    )


def _serialize_document(row: Document) -> DocumentMetadataResponse:
    return DocumentMetadataResponse(
        id=row.id,
        public_id=row.public_id or row.id,
        filename=row.filename,
        content_type=row.content_type,
        utility_type=row.utility_type,
        uploaded_at=row.uploaded_at,
    )


def _serialize_edit(row: BillReviewEdit) -> ReviewEditResponse:
    return ReviewEditResponse(
        field_name=row.field_name,
        previous_value=row.previous_value,
        updated_value=row.updated_value,
        edited_by=row.edited_by,
        edited_at=row.edited_at,
    )


def _get_bill_or_404(db: Session, user_id: str, bill_identifier: str) -> BillRecord:
    bill = (
        db.query(BillRecord)
        .filter(
            BillRecord.user_id == user_id,
            (BillRecord.id == bill_identifier) | (BillRecord.public_id == bill_identifier),
        )
        .first()
    )
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    return bill


def _invalidate_analytics_cache(user_id: str) -> None:
    cursor = 0
    pattern = f"analytics:{user_id}:*"
    while True:
        cursor, keys = redis_client.scan(cursor=cursor, match=pattern, count=100)
        if keys:
            redis_client.delete(*keys)
        if cursor == 0:
            break


@router.get("", response_model=PaginatedBillsResponse)
def list_bills(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: Literal["billing_period_end", "total_amount_due", "provider_name", "extracted_at", "overall_confidence"] = "billing_period_end",
    sort_order: Literal["asc", "desc"] = "desc",
    utility_type: str | None = None,
    provider: str | None = None,
    review_status: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(BillRecord).filter(BillRecord.user_id == user.id)
    if utility_type:
        query = query.filter(BillRecord.utility_type == utility_type)
    if provider:
        query = query.filter(BillRecord.provider_name.ilike(f"%{provider}%"))
    if review_status:
        query = query.filter(BillRecord.review_status == review_status)
    if start_date:
        query = query.filter(BillRecord.billing_period_end >= start_date)
    if end_date:
        query = query.filter(BillRecord.billing_period_end <= end_date)

    sort_map = {
        "billing_period_end": BillRecord.billing_period_end,
        "total_amount_due": BillRecord.total_amount_due,
        "provider_name": BillRecord.provider_name,
        "extracted_at": BillRecord.extracted_at,
        "overall_confidence": BillRecord.overall_confidence,
    }
    order_column = sort_map[sort_by]
    order_clause = asc(order_column) if sort_order == "asc" else desc(order_column)

    total = query.count()
    rows = query.order_by(order_clause).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedBillsResponse(
        items=[_serialize_bill(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{bill_id}", response_model=BillDetailResponse)
def get_bill_detail(bill_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    bill = _get_bill_or_404(db, user.id, bill_id)
    if not bill.document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill document not found")
    edits = (
        db.query(BillReviewEdit)
        .filter(BillReviewEdit.bill_record_id == bill.id)
        .order_by(BillReviewEdit.edited_at.desc())
        .limit(50)
        .all()
    )
    return BillDetailResponse(
        bill=_serialize_bill(bill),
        document=_serialize_document(bill.document),
        edits=[_serialize_edit(row) for row in edits],
    )


@router.patch("/{bill_id}", response_model=BillDetailResponse)
def update_bill(
    bill_id: str,
    payload: BillUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    bill = _get_bill_or_404(db, user.id, bill_id)
    updates = payload.model_dump(exclude_unset=True)
    for field_name, new_value in updates.items():
        previous_value = getattr(bill, field_name)
        if previous_value == new_value:
            continue
        setattr(bill, field_name, new_value)
        db.add(
            BillReviewEdit(
                bill_record_id=bill.id,
                field_name=field_name,
                previous_value=None if previous_value is None else str(previous_value),
                updated_value=None if new_value is None else str(new_value),
                edited_by=user.id,
                edited_at=datetime.utcnow(),
            )
        )

    bill.review_required = False
    bill.review_status = "reviewed"
    bill.reviewed_at = datetime.utcnow()
    bill.reviewed_by = user.id
    db.commit()

    _invalidate_analytics_cache(user.id)
    if bill.document and bill.document.job:
        set_job_status(
            bill.document.job.id,
            bill.document.job.status,
            error_message=bill.document.job.error_message,
            review_required=False,
            review_status="reviewed",
        )

    return get_bill_detail(bill_id=bill.public_id, db=db, user=user)


@router.get("/{bill_id}/document")
def get_bill_document(bill_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    bill = _get_bill_or_404(db, user.id, bill_id)
    if not bill.document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill document not found")

    try:
        data, filename = download_storage_object(bill.document.storage_uri)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    media_type = bill.document.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    safe_filename = bill.document.filename.replace('"', "")
    return Response(
        content=data,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{safe_filename}"'},
    )
