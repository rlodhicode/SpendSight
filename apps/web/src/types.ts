export type AuthResponse = {
  access_token: string;
  token_type: string;
};

export type JobStatus = {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  error_message?: string | null;
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
  billing_period_start: string;
  billing_period_end: string;
  total_amount_due: number;
  currency: string;
  usage_kwh?: number | null;
  usage_gallons?: number | null;
  usage_therms?: number | null;
  confidence_score: number;
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
