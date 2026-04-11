from .llm_extractor import ExtractedBillDocument, FieldConfidence, UtilityBillSchema

IMPORTANT_FIELD_WEIGHTS: dict[str, int] = {
    "header.provider_name": 20,
    "header.billing_period.start_date": 15,
    "header.billing_period.end_date": 15,
    "financials.total_amount_due": 25,
    "header.utility_type": 10,
    "header.account_number": 5,
    "header.due_date": 10,
}
REQUIRED_FIELDS = {
    "header.provider_name",
    "header.billing_period.start_date",
    "header.billing_period.end_date",
    "financials.total_amount_due",
    "header.utility_type",
    "header.account_number",
    "header.due_date",
}


def _field_value(extracted: UtilityBillSchema, field_name: str):
    if field_name == "header.provider_name":
        return extracted.header.provider_name
    if field_name == "header.billing_period.start_date":
        return extracted.header.billing_period.start_date
    if field_name == "header.billing_period.end_date":
        return extracted.header.billing_period.end_date
    if field_name == "financials.total_amount_due":
        return extracted.financials.total_amount_due
    if field_name == "header.utility_type":
        return extracted.header.utility_type
    if field_name == "header.account_number":
        return extracted.header.account_number
    if field_name == "header.due_date":
        return extracted.header.due_date
    return None


def has_missing_required_fields(extracted_doc: ExtractedBillDocument) -> bool:
    return any(_field_value(extracted_doc.extracted, field_name) is None for field_name in REQUIRED_FIELDS)


def compute_weighted_overall_confidence(extracted_doc: ExtractedBillDocument) -> float:
    confidence_lookup: dict[str, float] = {
        confidence.field_name: max(0.0, min(1.0, confidence.confidence_score))
        for confidence in extracted_doc.field_confidences
    }
    total_weight = sum(IMPORTANT_FIELD_WEIGHTS.values())
    if total_weight == 0:
        return 0.0

    weighted_total = 0.0
    for field_name, weight in IMPORTANT_FIELD_WEIGHTS.items():
        score = confidence_lookup.get(field_name)
        if score is None:
            value = _field_value(extracted_doc.extracted, field_name)
            score = 0.2 if value is None else 0.6
            extracted_doc.field_confidences.append(
                FieldConfidence(field_name=field_name, confidence_score=score, source="weighted-fallback")
            )
        weighted_total += score * weight

    return round(weighted_total / total_weight, 4)


def needs_human_review(extracted_doc: ExtractedBillDocument, threshold: float) -> bool:
    if has_missing_required_fields(extracted_doc):
        return True

    if extracted_doc.overall_confidence < threshold:
        return True

    return any(
        confidence.field_name in IMPORTANT_FIELD_WEIGHTS and confidence.confidence_score < threshold
        for confidence in extracted_doc.field_confidences
    )
