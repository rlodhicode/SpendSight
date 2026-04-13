import type { AnalyticsSummary } from "../types";
import { request } from "./client";

export type AnalyticsFilters = {
  include_needs_review?: boolean;
  provider?: string[];
  utility_type?: string[];
  start_date?: string;
  end_date?: string;
};

function buildAnalyticsQuery(filters: AnalyticsFilters = {}): string {
  const params = new URLSearchParams();
  params.set(
    "include_needs_review",
    String(filters.include_needs_review ?? true),
  );
  filters.provider?.forEach((p) => params.append("provider", p));
  filters.utility_type?.forEach((u) => params.append("utility_type", u));
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Full analytics page — all-time by default, filterable by date range / provider / utility. */
export function getSummary(
  token: string,
  filters: AnalyticsFilters = {},
): Promise<AnalyticsSummary> {
  return request<AnalyticsSummary>(
    `/api/v1/analytics/summary${buildAnalyticsQuery(filters)}`,
    {
      token,
    },
  );
}

/** Dashboard-specific — always rolling 12 months, no user filters. */
export function getDashboardSummary(token: string): Promise<AnalyticsSummary> {
  return request<AnalyticsSummary>("/api/v1/analytics/dashboard", { token });
}
