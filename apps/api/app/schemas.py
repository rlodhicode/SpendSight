from __future__ import annotations
from typing import Optional
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
    error_message: Optional[str] = None
    review_required: bool = False
    review_status: Optional[str] = None
    updated_at: Optional[datetime] = None


class BillRecordResponse(BaseModel):
    id: str
    public_id: str
    utility_type: str
    provider_name: str
    account_number: Optional[str]
    billing_period_start: date
    billing_period_end: date
    due_date: Optional[date]
    total_amount_due: float
    currency: str
    usage_amount: Optional[float]
    usage_unit: Optional[str]
    usage_kwh: Optional[float]
    usage_gallons: Optional[float]
    usage_therms: Optional[float]
    previous_balance: Optional[float]
    payments_credits: Optional[float]
    current_charges: Optional[float]
    adjustments_json: Optional[list]
    line_items_json: Optional[list]
    meter_readings_json: Optional[list]
    raw_extraction_json: Optional[dict]
    confidence_score: float
    overall_confidence: float = 0.0
    review_required: bool = False
    review_status: str
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    extracted_at: datetime


class DocumentMetadataResponse(BaseModel):
    id: str
    public_id: str
    filename: str
    content_type: Optional[str] = None
    utility_type: str
    uploaded_at: datetime


class PaginatedBillsResponse(BaseModel):
    items: list[BillRecordResponse]
    total: int
    page: int
    page_size: int


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


class FieldConfidenceResponse(BaseModel):
    field_name: str
    field_value: Optional[str]
    confidence_score: float
    source: str
    created_at: datetime


class ReviewEditResponse(BaseModel):
    field_name: str
    previous_value: Optional[str]
    updated_value: Optional[str]
    edited_by: str
    edited_at: datetime


class ReviewQueueItemResponse(BaseModel):
    bill_id: str
    bill_public_id: str
    user_id: str
    provider_name: str
    utility_type: str
    billing_period_end: date
    total_amount_due: float
    review_required: bool
    review_status: str
    overall_confidence: float
    extracted_at: datetime


class ReviewQueueResponse(BaseModel):
    page: int
    page_size: int
    total: int
    items: list[ReviewQueueItemResponse]


class ReviewDetailResponse(BaseModel):
    bill: BillRecordResponse
    field_confidences: list[FieldConfidenceResponse]
    edits: list[ReviewEditResponse]


class BillDetailResponse(BaseModel):
    bill: BillRecordResponse
    document: DocumentMetadataResponse
    edits: list[ReviewEditResponse]


class BillUpdateRequest(BaseModel):
    provider_name: Optional[str] = None
    account_number: Optional[str] = None
    utility_type: Optional[str] = None
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None
    due_date: Optional[date] = None
    total_amount_due: Optional[float] = None
    usage_amount: Optional[float] = None
    usage_unit: Optional[str] = None
    usage_kwh: Optional[float] = None
    usage_gallons: Optional[float] = None
    usage_therms: Optional[float] = None
    previous_balance: Optional[float] = None
    payments_credits: Optional[float] = None
    current_charges: Optional[float] = None


class ReviewUpdateRequest(BaseModel):
    provider_name: Optional[str] = None
    account_number: Optional[str] = None
    utility_type: Optional[str] = None
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None
    due_date: Optional[date] = None
    total_amount_due: Optional[float] = None
    usage_amount: Optional[float] = None
    usage_unit: Optional[str] = None
    usage_kwh: Optional[float] = None
    usage_gallons: Optional[float] = None
    usage_therms: Optional[float] = None
    previous_balance: Optional[float] = None
    payments_credits: Optional[float] = None
    current_charges: Optional[float] = None




