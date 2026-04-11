import type {
  BillDetail,
  BillsListQuery,
  BillUpdateRequest,
  PaginatedBillsResponse,
  UploadResponse,
} from "../types";
import { buildQueryString, getApiBase, request } from "./client";

export function uploadBill(
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
}

export function getBills(token: string, query: BillsListQuery = {}): Promise<PaginatedBillsResponse> {
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
}

export function getBillDetail(token: string, billId: string): Promise<BillDetail> {
  return request<BillDetail>(`/api/v1/bills/${billId}`, { token });
}

export function updateBill(token: string, billId: string, payload: BillUpdateRequest): Promise<BillDetail> {
  return request<BillDetail>(`/api/v1/bills/${billId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function getBillDocument(token: string, billId: string): Promise<{ blob: Blob; contentType: string | null }> {
  return fetch(`${getApiBase()}/api/v1/bills/${billId}/document`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
    return response.blob().then((blob) => ({
      blob,
      contentType: response.headers.get("content-type"),
    }));
  });
}
