from .llm_extractor import ExtractedBillDocument


def needs_human_review(extracted: ExtractedBillDocument, threshold: float) -> bool:
    if extracted.overall_confidence < threshold:
        return True

    required_fields = [
        extracted.extracted.header.provider_name,
        extracted.extracted.header.billing_period.start_date,
        extracted.extracted.header.billing_period.end_date,
        extracted.extracted.financials.total_amount_due,
    ]
    if any(value is None for value in required_fields):
        return True

    return any(item.confidence_score < threshold for item in extracted.field_confidences)
