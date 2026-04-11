import type {
  ReviewDetail,
  ReviewQueueResponse,
  ReviewUpdateRequest,
} from "../types";
import { request } from "./client";

export function getReviewQueue(token: string, page = 1, pageSize = 20): Promise<ReviewQueueResponse> {
  return request<ReviewQueueResponse>(`/api/v1/review/queue?page=${page}&page_size=${pageSize}`, {
    token,
  });
}

export function getReviewDetail(token: string, billId: string): Promise<ReviewDetail> {
  return request<ReviewDetail>(`/api/v1/review/${billId}`, { token });
}

export function updateReview(token: string, billId: string, payload: ReviewUpdateRequest): Promise<ReviewDetail> {
  return request<ReviewDetail>(`/api/v1/review/${billId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}
