from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UploadResponse(BaseModel):
    document_id: str
    job_id: str
    status: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    error_message: str | None = None
    updated_at: datetime | None = None


class BillRecordResponse(BaseModel):
    id: str
    utility_type: str
    provider_name: str
    billing_period_start: date
    billing_period_end: date
    total_amount_due: float
    currency: str
    usage_kwh: float | None
    usage_gallons: float | None
    usage_therms: float | None
    confidence_score: float
    extracted_at: datetime


class MonthlyTotal(BaseModel):
    month: str
    total: float


class NamedTotal(BaseModel):
    name: str
    total: float


class AnalyticsSummaryResponse(BaseModel):
    total_spend: float
    average_bill: float
    bills_count: int
    totals_by_month: list[MonthlyTotal]
    totals_by_provider: list[NamedTotal]
    totals_by_utility: list[NamedTotal]

