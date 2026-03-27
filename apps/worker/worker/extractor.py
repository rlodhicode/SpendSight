import hashlib
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path


@dataclass
class ExtractionResult:
    provider_name: str
    billing_period_start: date
    billing_period_end: date
    total_amount_due: float
    currency: str
    usage_kwh: float | None
    usage_gallons: float | None
    usage_therms: float | None
    confidence_score: float


def mock_extract(file_path: str, utility_type: str) -> ExtractionResult:
    data = Path(file_path).read_bytes()
    seed = int(hashlib.sha256(data).hexdigest()[:8], 16)

    providers = {
        "electricity": ["Xcel Energy", "Duke Energy", "Pacific Power"],
        "water": ["Denver Water", "Aurora Water", "City Utilities"],
        "gas": ["Atmos Energy", "CenterPoint", "Dominion Energy"],
        "internet": ["Comcast", "CenturyLink", "AT&T Fiber"],
    }

    key = utility_type.lower()
    provider_list = providers.get(key, ["Utility Provider"])
    provider_name = provider_list[seed % len(provider_list)]

    end = date.today().replace(day=1) - timedelta(days=1)
    start = end.replace(day=1)
    total_amount = round(40 + (seed % 220) + ((seed % 100) / 100), 2)
    confidence = round(0.80 + ((seed % 19) / 100), 2)

    usage_kwh = float(300 + (seed % 500)) if key == "electricity" else None
    usage_gallons = float(1500 + (seed % 2000)) if key == "water" else None
    usage_therms = float(20 + (seed % 90)) if key == "gas" else None

    return ExtractionResult(
        provider_name=provider_name,
        billing_period_start=start,
        billing_period_end=end,
        total_amount_due=total_amount,
        currency="USD",
        usage_kwh=usage_kwh,
        usage_gallons=usage_gallons,
        usage_therms=usage_therms,
        confidence_score=confidence,
    )

