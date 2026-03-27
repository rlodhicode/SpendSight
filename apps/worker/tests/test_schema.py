from worker.llm_extractor import UtilityBillSchema


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
    from worker.llm_extractor import _normalize_payload

    payload = {
        "header": {"billing_period": None},
        "usage": {"meter_readings": None},
        "financials": {"adjustments": None},
        "line_items": None,
    }
    normalized = _normalize_payload(payload)
    result = UtilityBillSchema.model_validate(normalized)
    assert result.usage.meter_readings == []
    assert result.financials.adjustments == []
    assert result.line_items == []
