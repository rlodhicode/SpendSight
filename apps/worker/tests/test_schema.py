from worker.llm_extractor import (
    FieldConfidence,
    UtilityBillSchema,
    _empty_extracted_document,
    _normalize_payload,
)
from worker.review import needs_human_review
from worker.review import compute_weighted_overall_confidence, has_missing_required_fields


def test_schema_validation():
    payload = {
        "header": {
            "utility_type": "electric",
            "provider_name": "Xcel Energy",
            "account_number": "1234",
            "billing_period": {"start_date": "2026-01-01", "end_date": "2026-01-31"},
            "due_date": "2026-02-15",
        },
        "usage": {"amount": 100.0, "unit": "kWh", "meter_readings": []},
        "financials": {
            "previous_balance": 0.0,
            "payments_credits": 0.0,
            "current_charges": 60.0,
            "total_amount_due": 60.0,
            "adjustments": [],
        },
        "line_items": [],
    }
    result = UtilityBillSchema.model_validate(payload)
    assert result.header.provider_name == "Xcel Energy"
    assert result.financials.total_amount_due == 60.0


def test_schema_accepts_null_lists_after_normalize():
    payload = {
        "extracted": {
            "header": {"billing_period": None},
            "usage": {"meter_readings": None},
            "financials": {"adjustments": None},
            "line_items": None,
        },
        "field_confidences": None,
    }
    normalized = _normalize_payload(payload)
    result = UtilityBillSchema.model_validate(normalized["extracted"])
    assert result.usage.meter_readings == []
    assert result.financials.adjustments == []
    assert result.line_items == []


def test_needs_review_when_confidence_below_threshold():
    payload = {
        "header": {
            "utility_type": "electric",
            "provider_name": "Xcel Energy",
            "account_number": "1234",
            "billing_period": {"start_date": "2026-01-01", "end_date": "2026-01-31"},
            "due_date": "2026-02-15",
        },
        "usage": {"amount": 100.0, "unit": "kWh", "meter_readings": []},
        "financials": {
            "previous_balance": 0.0,
            "payments_credits": 0.0,
            "current_charges": 60.0,
            "total_amount_due": 60.0,
            "adjustments": [],
        },
        "line_items": [],
    }
    extracted = UtilityBillSchema.model_validate(payload)
    envelope = type(
        "Doc",
        (),
        {
            "overall_confidence": 0.72,
            "field_confidences": [FieldConfidence(field_name="financials.total_amount_due", confidence_score=0.72)],
            "extracted": extracted,
        },
    )
    assert needs_human_review(envelope, threshold=0.75) is True


def test_normalize_payload_coerces_invalid_enum_values_to_none():
    payload = {
        "extracted": {
            "header": {"utility_type": "telecom", "billing_period": {}},
            "usage": {"unit": "KW", "meter_readings": []},
            "financials": {"adjustments": []},
            "line_items": [],
        },
        "field_confidences": [],
    }
    normalized = _normalize_payload(payload)
    assert normalized["extracted"]["header"]["utility_type"] is None
    assert normalized["extracted"]["usage"]["unit"] is None


def test_empty_extracted_document_defaults_to_low_confidence():
    fallback = _empty_extracted_document()
    assert fallback.overall_confidence == 0.05
    assert fallback.extracted.financials.total_amount_due is None


def test_weighted_confidence_uses_required_field_weights():
    payload = {
        "header": {
            "utility_type": "electric",
            "provider_name": "Xcel Energy",
            "account_number": "1234",
            "billing_period": {"start_date": "2026-01-01", "end_date": "2026-01-31"},
            "due_date": "2026-02-15",
        },
        "usage": {"amount": 100.0, "unit": "kWh", "meter_readings": []},
        "financials": {"total_amount_due": 60.0, "adjustments": []},
        "line_items": [],
    }
    extracted = UtilityBillSchema.model_validate(payload)
    envelope = type(
        "Doc",
        (),
        {
            "overall_confidence": 0.0,
            "field_confidences": [
                FieldConfidence(field_name="header.provider_name", confidence_score=0.9),
                FieldConfidence(field_name="header.billing_period.start_date", confidence_score=0.8),
                FieldConfidence(field_name="header.billing_period.end_date", confidence_score=0.7),
                FieldConfidence(field_name="financials.total_amount_due", confidence_score=0.95),
                FieldConfidence(field_name="header.utility_type", confidence_score=0.85),
                FieldConfidence(field_name="header.account_number", confidence_score=0.9),
                FieldConfidence(field_name="header.due_date", confidence_score=0.8),
            ],
            "extracted": extracted,
        },
    )
    result = compute_weighted_overall_confidence(envelope)
    assert result > 0.8


def test_missing_required_fields_force_review():
    payload = {
        "header": {
            "utility_type": "electric",
            "provider_name": "Xcel Energy",
            "account_number": None,
            "billing_period": {"start_date": "2026-01-01", "end_date": "2026-01-31"},
            "due_date": "2026-02-15",
        },
        "usage": {"amount": 100.0, "unit": "kWh", "meter_readings": []},
        "financials": {"total_amount_due": 60.0, "adjustments": []},
        "line_items": [],
    }
    extracted = UtilityBillSchema.model_validate(payload)
    envelope = type(
        "Doc",
        (),
        {
            "overall_confidence": 0.99,
            "field_confidences": [FieldConfidence(field_name="header.account_number", confidence_score=0.99)],
            "extracted": extracted,
        },
    )
    assert has_missing_required_fields(envelope) is True
    assert needs_human_review(envelope, threshold=0.75) is True
