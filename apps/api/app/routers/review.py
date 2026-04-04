from datetime import datetime
import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..config import settings
from ..models import BillFieldConfidence, BillRecord, BillReviewEdit, User
from ..schemas import (
    BillRecordResponse,
    FieldConfidenceResponse,
    ReviewDetailResponse,
    ReviewEditResponse,
    ReviewQueueItemResponse,
    ReviewQueueResponse,
    ReviewUpdateRequest,
)
from ..services import redis_client

router = APIRouter(prefix="/review", tags=["review"])


def _serialize_bill(row: BillRecord) -> BillRecordResponse:
    return BillRecordResponse(
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
        overall_confidence=row.overall_confidence,
        review_required=row.review_required,
        review_status=row.review_status or "not_required",
        reviewed_at=row.reviewed_at,
        reviewed_by=row.reviewed_by,
        extracted_at=row.extracted_at,
    )


@router.get("/queue", response_model=ReviewQueueResponse)
def review_queue(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(BillRecord).filter(BillRecord.user_id == user.id, BillRecord.review_required.is_(True))
    total = query.count()
    rows = query.order_by(BillRecord.extracted_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = [
        ReviewQueueItemResponse(
            bill_id=row.id,
            user_id=row.user_id,
            provider_name=row.provider_name,
            utility_type=row.utility_type,
            billing_period_end=row.billing_period_end,
            total_amount_due=float(row.total_amount_due),
            review_required=row.review_required,
            review_status=row.review_status or "not_required",
            overall_confidence=row.overall_confidence,
            extracted_at=row.extracted_at,
        )
        for row in rows
    ]
    return ReviewQueueResponse(page=page, page_size=page_size, total=total, items=items)


@router.get("/{bill_id}", response_model=ReviewDetailResponse)
def review_detail(bill_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    bill = db.query(BillRecord).filter(BillRecord.id == bill_id, BillRecord.user_id == user.id).first()
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    confidences = (
        db.query(BillFieldConfidence)
        .filter(BillFieldConfidence.bill_record_id == bill_id)
        .order_by(BillFieldConfidence.created_at.asc())
        .all()
    )
    edits = db.query(BillReviewEdit).filter(BillReviewEdit.bill_record_id == bill_id).order_by(BillReviewEdit.edited_at.desc()).all()

    return ReviewDetailResponse(
        bill=_serialize_bill(bill),
        field_confidences=[
            FieldConfidenceResponse(
                field_name=row.field_name,
                field_value=row.field_value,
                confidence_score=row.confidence_score,
                source=row.source,
                created_at=row.created_at,
            )
            for row in confidences
        ],
        edits=[
            ReviewEditResponse(
                field_name=row.field_name,
                previous_value=row.previous_value,
                updated_value=row.updated_value,
                edited_by=row.edited_by,
                edited_at=row.edited_at,
            )
            for row in edits
        ],
    )


@router.patch("/{bill_id}", response_model=ReviewDetailResponse)
def update_review(
    bill_id: str,
    payload: ReviewUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    bill = db.query(BillRecord).filter(BillRecord.id == bill_id, BillRecord.user_id == user.id).first()
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return review_detail(bill_id=bill_id, db=db, user=user)

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

    cursor = 0
    pattern = f"analytics:{user.id}:*"
    while True:
        cursor, keys = redis_client.scan(cursor=cursor, match=pattern, count=100)
        if keys:
            redis_client.delete(*keys)
        if cursor == 0:
            break

    # Best-effort status cache refresh for any linked job in this response lifecycle.
    if bill.document and bill.document.job:
        redis_client.setex(
            f"job:{bill.document.job.id}",
            settings.job_status_ttl_seconds,
            json.dumps(
                {
                    "job_id": bill.document.job.id,
                    "status": bill.document.job.status,
                    "updated_at": datetime.utcnow().isoformat(),
                    "error_message": bill.document.job.error_message,
                    "review_required": False,
                    "review_status": "reviewed",
                }
            ),
        )

    return review_detail(bill_id=bill_id, db=db, user=user)
