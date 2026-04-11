import type { AnalyticsFilters, AnalyticsSummary } from "../types";
import { request } from "./client";

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

export function getSummary(token: string, filters: AnalyticsFilters = {}): Promise<AnalyticsSummary> {
  return request<AnalyticsSummary>(`/api/v1/analytics/summary${buildAnalyticsQuery(filters)}`, {
    token,
  });
}
