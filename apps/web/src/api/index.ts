import type {
  AnalyticsFilters,
  AnalyticsSummary,
  AuthResponse,
  BillDetail,
  BillRecord,
  BillUpdateRequest,
  BillsListQuery,
  JobStatus,
  PaginatedBillsResponse,
  ReviewDetail,
  ReviewQueueResponse,
  ReviewUpdateRequest,
  UploadResponse,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type ApiOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
  formData?: FormData;
};

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: HeadersInit = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (!options.formData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body:
      options.formData ??
      (options.body ? JSON.stringify(options.body) : undefined),
  });

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const payload = await response.json();
      detail = payload.detail ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function buildAnalyticsQuery(filters: AnalyticsFilters = {}): string {
  const params = new URLSearchParams();
  const months = filters.months ?? 12;
  params.set("months", String(months));
  params.set(
    "include_needs_review",
    String(filters.include_needs_review ?? true)
  );
  filters.provider?.forEach((provider) => params.append("provider", provider));
  filters.utility_type?.forEach((utility) =>
    params.append("utility_type", utility)
  );
  if (filters.start_date) {
    params.set("start_date", filters.start_date);
  }
  if (filters.end_date) {
    params.set("end_date", filters.end_date);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const api = {
  register(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: { email, password },
    });
  },
  login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: { email, password },
    });
  },
  uploadBill(
    token: string,
    utilityType: string,
    file: File
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("utility_type", utilityType);
    formData.append("file", file);
    return request<UploadResponse>("/api/v1/bills/upload", {
      method: "POST",
      token,
      formData,
    });
  },
  getJob(token: string, jobId: string): Promise<JobStatus> {
    return request<JobStatus>(`/api/v1/jobs/${jobId}`, { token });
  },
  getSummary(token: string, filters: AnalyticsFilters = {}): Promise<AnalyticsSummary> {
    return request<AnalyticsSummary>(`/api/v1/analytics/summary${buildAnalyticsQuery(filters)}`, {
      token,
    });
  },
  getBills(token: string, query: BillsListQuery = {}): Promise<PaginatedBillsResponse> {
    return request<PaginatedBillsResponse>(
      `/api/v1/bills${buildQueryString({
        page: query.page ?? 1,
        page_size: query.page_size ?? 20,
        sort_by: query.sort_by ?? "billing_period_end",
        sort_order: query.sort_order ?? "desc",
        utility_type: query.utility_type,
        provider: query.provider,
        review_status: query.review_status,
        start_date: query.start_date,
        end_date: query.end_date,
      })}`,
      { token }
    );
  },
  getBillDetail(token: string, billId: string): Promise<BillDetail> {
    return request<BillDetail>(`/api/v1/bills/${billId}`, { token });
  },
  updateBill(token: string, billId: string, payload: BillUpdateRequest): Promise<BillDetail> {
    return request<BillDetail>(`/api/v1/bills/${billId}`, {
      method: "PATCH",
      token,
      body: payload,
    });
  },
  async getBillDocument(token: string, billId: string): Promise<{ blob: Blob; contentType: string | null }> {
    const response = await fetch(`${API_BASE}/api/v1/bills/${billId}/document`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      let detail = "Request failed";
      try {
        const payload = await response.json();
        detail = payload.detail ?? detail;
      } catch {
        // ignore parse errors
      }
      throw new Error(detail);
    }
    return { blob: await response.blob(), contentType: response.headers.get("content-type") };
  },
  getReviewQueue(token: string, page = 1, pageSize = 20): Promise<ReviewQueueResponse> {
    return request<ReviewQueueResponse>(`/api/v1/review/queue?page=${page}&page_size=${pageSize}`, {
      token,
    });
  },
  getReviewDetail(token: string, billId: string): Promise<ReviewDetail> {
    return request<ReviewDetail>(`/api/v1/review/${billId}`, { token });
  },
  updateReview(token: string, billId: string, payload: ReviewUpdateRequest): Promise<ReviewDetail> {
    return request<ReviewDetail>(`/api/v1/review/${billId}`, {
      method: "PATCH",
      token,
      body: payload,
    });
  },
};
