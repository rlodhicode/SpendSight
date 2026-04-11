const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type ApiOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
  formData?: FormData;
};

export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
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

export function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: HeadersInit = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (!options.formData) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body:
      options.formData ??
      (options.body ? JSON.stringify(options.body) : undefined),
  }).then((response) => {
    if (!response.ok) {
      return response.json().then(
        (payload) => {
          throw new Error(payload.detail ?? "Request failed");
        },
        () => {
          throw new Error("Request failed");
        }
      );
    }
    return response.json() as Promise<T>;
  });
}

export function getApiBase() {
  return API_BASE;
}
