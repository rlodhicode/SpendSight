export type AuthResponse = {
  access_token: string;
  token_type: string;
};

export type JobStatus = {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed" | "needs_review";
  error_message?: string | null;
  review_required?: boolean;
  review_status?: string | null;
  updated_at?: string | null;
};

export type UploadResponse = {
  document_id: string;
  job_id: string;
  status: string;
};

export type BillRecord = {
  id: string;
  utility_type: string;
  provider_name: string;
  account_number?: string | null;
  billing_period_start: string;
  billing_period_end: string;
  due_date?: string | null;
  total_amount_due: number;
  currency: string;
  usage_amount?: number | null;
  usage_unit?: string | null;
  usage_kwh?: number | null;
  usage_gallons?: number | null;
  usage_therms?: number | null;
  previous_balance?: number | null;
  payments_credits?: number | null;
  current_charges?: number | null;
  adjustments_json?: unknown[] | null;
  line_items_json?: unknown[] | null;
  meter_readings_json?: unknown[] | null;
  raw_extraction_json?: Record<string, unknown> | null;
  confidence_score: number;
  overall_confidence?: number;
  review_required?: boolean;
  review_status?: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  extracted_at: string;
};

export type AnalyticsSummary = {
  total_spend: number;
  average_bill: number;
  bills_count: number;
  totals_by_month: { month: string; total: number }[];
  totals_by_provider: { name: string; total: number }[];
  totals_by_utility: { name: string; total: number }[];
};

export type ReviewQueueItem = {
  bill_id: string;
  user_id: string;
  provider_name: string;
  utility_type: string;
  billing_period_end: string;
  total_amount_due: number;
  review_required: boolean;
  review_status: string;
  overall_confidence: number;
  extracted_at: string;
};

export type ReviewQueueResponse = {
  page: number;
  page_size: number;
  total: number;
  items: ReviewQueueItem[];
};

export type FieldConfidence = {
  field_name: string;
  field_value?: string | null;
  confidence_score: number;
  source: string;
  created_at: string;
};

export type ReviewEdit = {
  field_name: string;
  previous_value?: string | null;
  updated_value?: string | null;
  edited_by: string;
  edited_at: string;
};

export type ReviewDetail = {
  bill: BillRecord;
  field_confidences: FieldConfidence[];
  edits: ReviewEdit[];
};

export type ReviewUpdateRequest = Partial<
  Pick<
    BillRecord,
    | "provider_name"
    | "account_number"
    | "utility_type"
    | "billing_period_start"
    | "billing_period_end"
    | "due_date"
    | "total_amount_due"
    | "usage_amount"
    | "usage_unit"
    | "usage_kwh"
    | "usage_gallons"
    | "usage_therms"
    | "previous_balance"
    | "payments_credits"
    | "current_charges"
  >
>;
