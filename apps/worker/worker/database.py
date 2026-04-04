from __future__ import annotations
from typing import Optional
from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import JSON, Date, DateTime, Float, ForeignKey, Numeric, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass


def new_id() -> str:
    return str(uuid4())


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    utility_type: Mapped[str] = mapped_column(String(64), index=True)
    storage_uri: Mapped[str] = mapped_column(Text)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime)


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), unique=True)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    document: Mapped["Document"] = relationship()


class BillRecord(Base):
    __tablename__ = "bill_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), unique=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    utility_type: Mapped[str] = mapped_column(String(64), index=True)
    provider_name: Mapped[str] = mapped_column(String(255), index=True)
    account_number: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    billing_period_start: Mapped[date] = mapped_column(Date)
    billing_period_end: Mapped[date] = mapped_column(Date, index=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    total_amount_due: Mapped[float] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    usage_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    usage_unit: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    usage_kwh: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    usage_gallons: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    usage_therms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    previous_balance: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    payments_credits: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    current_charges: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    adjustments_json: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    line_items_json: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    meter_readings_json: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    raw_extraction_json: Mapped[dict] = mapped_column(JSON)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    overall_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    review_required: Mapped[bool] = mapped_column(default=False, index=True)
    review_status: Mapped[str] = mapped_column(String(32), default="not_required", index=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    extracted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BillFieldConfidence(Base):
    __tablename__ = "bill_field_confidences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    bill_record_id: Mapped[str] = mapped_column(ForeignKey("bill_records.id"), index=True)
    field_name: Mapped[str] = mapped_column(String(128), index=True)
    field_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    source: Mapped[str] = mapped_column(String(64), default="gemini")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BillReviewEdit(Base):
    __tablename__ = "bill_review_edits"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    bill_record_id: Mapped[str] = mapped_column(ForeignKey("bill_records.id"), index=True)
    field_name: Mapped[str] = mapped_column(String(128), index=True)
    previous_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    edited_by: Mapped[str] = mapped_column(String(36), index=True)
    edited_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)




