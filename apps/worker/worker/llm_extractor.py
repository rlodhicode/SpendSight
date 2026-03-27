import json
from datetime import date
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Literal

from docx import Document as DocxDocument
from google import genai
from google.genai import types
from pydantic import BaseModel, Field, ValidationError

from .config import settings


class BillingPeriod(BaseModel):
    start_date: date | None = None
    end_date: date | None = None


class Header(BaseModel):
    utility_type: Literal["electric", "water", "gas", "waste"] | None = None
    provider_name: str | None = None
    account_number: str | None = None
    billing_period: BillingPeriod = Field(default_factory=BillingPeriod)
    due_date: date | None = None


class MeterReading(BaseModel):
    meter_id: str | None = None
    start: float | None = None
    end: float | None = None


class Usage(BaseModel):
    amount: float | None = None
    unit: Literal["kWh", "Gallons", "Therms"] | None = None
    meter_readings: list[MeterReading] = Field(default_factory=list)


class Adjustment(BaseModel):
    description: str | None = None
    amount: float | None = None


class Financials(BaseModel):
    previous_balance: float | None = None
    payments_credits: float | None = None
    current_charges: float | None = None
    total_amount_due: float | None = None
    adjustments: list[Adjustment] = Field(default_factory=list)


class LineItem(BaseModel):
    description: str | None = None
    quantity: float | None = None
    rate: float | None = None
    total: float | None = None


class UtilityBillSchema(BaseModel):
    header: Header
    usage: Usage
    financials: Financials
    line_items: list[LineItem] = Field(default_factory=list)


def _mime_for_filename(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    mapping = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    return mapping.get(ext, "application/octet-stream")


def _docx_to_text(data: bytes) -> str:
    with NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
        tmp.write(data)
        tmp_path = Path(tmp.name)
    try:
        doc = DocxDocument(str(tmp_path))
        return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


def _prompt_schema() -> str:
    schema = {
        "header": {
            "utility_type": "electric | water | gas | waste",
            "provider_name": "string",
            "account_number": "string",
            "billing_period": {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"},
            "due_date": "YYYY-MM-DD",
        },
        "usage": {
            "amount": 0.0,
            "unit": "kWh | Gallons | Therms",
            "meter_readings": [{"meter_id": "string", "start": 0.0, "end": 0.0}],
        },
        "financials": {
            "previous_balance": 0.0,
            "payments_credits": 0.0,
            "current_charges": 0.0,
            "total_amount_due": 0.0,
            "adjustments": [{"description": "string", "amount": 0.0}],
        },
        "line_items": [{"description": "string", "quantity": 0.0, "rate": 0.0, "total": 0.0}],
    }
    return (
        "You are an expert utility bill auditor.\n"
        "Extract data from the provided bill document.\n"
        "Return strictly valid JSON matching this exact schema.\n"
        f"{json.dumps(schema)}\n"
        "If a scalar field is missing, return null.\n"
        "If a list field is missing, return an empty array [].\n"
        "Capture all visible line items.\n"
        "Do not return markdown."
    )


def _normalize_payload(parsed: dict) -> dict:
    # LLMs sometimes emit null for array/object fields; normalize before validation.
    if parsed.get("header") is None:
        parsed["header"] = {}
    if parsed["header"].get("billing_period") is None:
        parsed["header"]["billing_period"] = {}

    if parsed.get("usage") is None:
        parsed["usage"] = {}
    if parsed["usage"].get("meter_readings") is None:
        parsed["usage"]["meter_readings"] = []

    if parsed.get("financials") is None:
        parsed["financials"] = {}
    if parsed["financials"].get("adjustments") is None:
        parsed["financials"]["adjustments"] = []

    if parsed.get("line_items") is None:
        parsed["line_items"] = []

    return parsed


def extract_with_gemini(data: bytes, filename: str) -> UtilityBillSchema:
    client = genai.Client(vertexai=True, project=settings.gcp_project_id, location=settings.gcp_location)
    mime = _mime_for_filename(filename)
    prompt = _prompt_schema()

    if mime.endswith("document.wordprocessingml.document"):
        contents = [f"Document text:\n{_docx_to_text(data)}\n\n{prompt}"]
    else:
        contents = [types.Part.from_bytes(data=data, mime_type=mime), prompt]

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=contents,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    raw_json = response.text or "{}"
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Model returned invalid JSON: {exc}") from exc

    if not isinstance(parsed, dict):
        raise ValueError("Model output must be a JSON object")
    parsed = _normalize_payload(parsed)

    try:
        return UtilityBillSchema.model_validate(parsed)
    except ValidationError as exc:
        raise ValueError(f"Model output failed schema validation: {exc}") from exc
