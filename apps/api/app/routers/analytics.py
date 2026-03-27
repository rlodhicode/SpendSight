import json
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import BillRecord, User
from ..schemas import AnalyticsSummaryResponse, MonthlyTotal, NamedTotal
from ..services import redis_client

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def summary(months: int = 12, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cache_key = f"analytics:{user.id}:{months}"
    cached = redis_client.get(cache_key)
    if cached:
        return AnalyticsSummaryResponse(**json.loads(cached))

    cutoff = datetime.utcnow().date() - timedelta(days=30 * months)
    rows = (
        db.query(BillRecord)
        .filter(BillRecord.user_id == user.id, BillRecord.billing_period_end >= cutoff)
        .order_by(BillRecord.billing_period_end.asc())
        .all()
    )

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

    response = AnalyticsSummaryResponse(
        total_spend=round(total_spend, 2),
        average_bill=round(total_spend / len(rows), 2) if rows else 0.0,
        bills_count=len(rows),
        totals_by_month=[MonthlyTotal(month=k, total=round(v, 2)) for k, v in sorted(by_month.items())],
        totals_by_provider=[NamedTotal(name=k, total=round(v, 2)) for k, v in sorted(by_provider.items())],
        totals_by_utility=[NamedTotal(name=k, total=round(v, 2)) for k, v in sorted(by_utility.items())],
    )
    redis_client.setex(cache_key, settings.analytics_cache_ttl_seconds, response.model_dump_json())
    return response

