export const UTILITY_COLORS: Record<
  string,
  "warning" | "primary" | "secondary" | "success" | "default"
> = {
  electricity: "warning",
  electric: "warning",
  water: "primary",
  gas: "secondary",
  waste: "default",
  internet: "success",
};

export const UTILITY_LABELS: Record<string, string> = {
  electricity: "Electric",
  electric: "Electric",
  water: "Water",
  gas: "Gas",
  waste: "Waste",
  internet: "Internet",
};

export const REVIEW_STATUS_CONFIG: Record<
  string,
  { label: string; color: "success" | "warning" | "default" | "info" }
> = {
  not_required: { label: "OK", color: "success" },
  reviewed: { label: "Reviewed", color: "info" },
  needs_review: { label: "Needs Review", color: "warning" },
};

export const ROWS_PER_PAGE_OPTIONS = [10, 20, 50];

export function getConfidenceColor(score: number): string {
  if (score >= 0.85) return "#1D8348";
  if (score >= 0.6) return "#D68910";
  return "#C0392B";
}
