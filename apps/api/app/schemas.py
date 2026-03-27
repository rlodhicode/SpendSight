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
    account_number: str | None
    billing_period_start: date
    billing_period_end: date
    due_date: date | None
    total_amount_due: float
    currency: str
    usage_amount: float | None
    usage_unit: str | None
    usage_kwh: float | None
    usage_gallons: float | None
    usage_therms: float | None
    previous_balance: float | None
    payments_credits: float | None
    current_charges: float | None
    adjustments_json: list | None
    line_items_json: list | None
    meter_readings_json: list | None
    raw_extraction_json: dict | None
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
