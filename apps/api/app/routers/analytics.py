import json
from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import BillRecord, User
from ..schemas import AnalyticsSummaryResponse, MonthlyTotal, NamedTotal
from ..services import redis_client

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _build_summary(
    db: Session,
    user_id: str,
    include_needs_review: bool,
    provider: list[str] | None,
    utility_type: list[str] | None,
    start_date: date | None,
    end_date: date | None,
) -> AnalyticsSummaryResponse:
    """Core query shared by all analytics endpoints."""
    query = db.query(BillRecord).filter(BillRecord.user_id == user_id)

    if start_date:
        query = query.filter(BillRecord.billing_period_end >= start_date)
    if end_date:
        query = query.filter(BillRecord.billing_period_end <= end_date)
    if not include_needs_review:
        query = query.filter(BillRecord.review_status != "needs_review")
    if provider:
        query = query.filter(BillRecord.provider_name.in_(provider))
    if utility_type:
        query = query.filter(BillRecord.utility_type.in_(utility_type))

    rows = query.order_by(BillRecord.billing_period_end.asc()).all()

    by_month: dict[str, float] = defaultdict(float)
    by_provider: dict[str, float] = defaultdict(float)
    by_utility: dict[str, float] = defaultdict(float)
    total_spend = 0.0

    for row in rows:
        total = float(row.total_amount_due)
        month_key = row.billing_period_end.strftime("%Y-%m")
        by_month[month_key] += total
        by_provider[row.provider_name] += total
        by_utility[row.utility_type] += total
        total_spend += total

    return AnalyticsSummaryResponse(
        total_spend=round(total_spend, 2),
        average_bill=round(total_spend / len(rows), 2) if rows else 0.0,
        bills_count=len(rows),
        totals_by_month=[MonthlyTotal(month=k, total=round(v, 2)) for k, v in sorted(by_month.items())],
        totals_by_provider=[NamedTotal(name=k, total=round(v, 2)) for k, v in sorted(by_provider.items())],
        totals_by_utility=[NamedTotal(name=k, total=round(v, 2)) for k, v in sorted(by_utility.items())],
    )


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def summary(
    include_needs_review: bool = True,
    provider: list[str] | None = Query(default=None),
    utility_type: list[str] | None = Query(default=None),
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Flexible analytics summary for the Analytics page.
    No date range = all time. Filtered by provided start/end dates when given.
    """
    provider_key = ",".join(sorted(provider or []))
    utility_key = ",".join(sorted(utility_type or []))
    start_key = start_date.isoformat() if start_date else "all"
    end_key = end_date.isoformat() if end_date else "all"
    cache_key = (
        f"analytics:{user.id}:{include_needs_review}:"
        f"{provider_key}:{utility_key}:{start_key}:{end_key}"
    )
    cached = redis_client.get(cache_key)
    if cached:
        return AnalyticsSummaryResponse(**json.loads(cached))

    response = _build_summary(
        db=db,
        user_id=user.id,
        include_needs_review=include_needs_review,
        provider=provider,
        utility_type=utility_type,
        start_date=start_date,
        end_date=end_date,
    )
    redis_client.setex(cache_key, settings.analytics_cache_ttl_seconds, response.model_dump_json())
    return response


@router.get("/dashboard", response_model=AnalyticsSummaryResponse)
def dashboard_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Fixed 12-month summary for the Dashboard page.
    Always includes all bills in the rolling 12-month window; no user-facing filters.
    """
    rolling_start = datetime.utcnow().date() - timedelta(days=365)
    cache_key = f"analytics:dashboard:{user.id}:{rolling_start.isoformat()}"
    cached = redis_client.get(cache_key)
    if cached:
        return AnalyticsSummaryResponse(**json.loads(cached))

    response = _build_summary(
        db=db,
        user_id=user.id,
        include_needs_review=True,
        provider=None,
        utility_type=None,
        start_date=rolling_start,
        end_date=None,
    )
    redis_client.setex(cache_key, settings.analytics_cache_ttl_seconds, response.model_dump_json())
    return response