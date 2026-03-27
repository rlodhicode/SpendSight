import type {
  AnalyticsSummary,
  AuthResponse,
  BillRecord,
  JobStatus,
  UploadResponse,
} from "./types";

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
      // Ignore parse failures and return generic error.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
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
    file: File,
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
  getSummary(token: string): Promise<AnalyticsSummary> {
    return request<AnalyticsSummary>("/api/v1/analytics/summary?months=12", {
      token,
    });
  },
  getBills(token: string): Promise<BillRecord[]> {
    return request<BillRecord[]>("/api/v1/bills", { token });
  },
};
