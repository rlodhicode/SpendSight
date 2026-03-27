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
    content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utility_type: Mapped[str] = mapped_column(String(64), index=True)
    storage_uri: Mapped[str] = mapped_column(Text)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime)


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), unique=True)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    account_number: Mapped[str | None] = mapped_column(String(128), nullable=True)
    billing_period_start: Mapped[date] = mapped_column(Date)
    billing_period_end: Mapped[date] = mapped_column(Date, index=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    total_amount_due: Mapped[float] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    usage_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    usage_unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    usage_kwh: Mapped[float | None] = mapped_column(Float, nullable=True)
    usage_gallons: Mapped[float | None] = mapped_column(Float, nullable=True)
    usage_therms: Mapped[float | None] = mapped_column(Float, nullable=True)
    previous_balance: Mapped[float | None] = mapped_column(Float, nullable=True)
    payments_credits: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_charges: Mapped[float | None] = mapped_column(Float, nullable=True)
    adjustments_json: Mapped[list | None] = mapped_column(JSON, nullable=True)
    line_items_json: Mapped[list | None] = mapped_column(JSON, nullable=True)
    meter_readings_json: Mapped[list | None] = mapped_column(JSON, nullable=True)
    raw_extraction_json: Mapped[dict] = mapped_column(JSON)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    extracted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
