import type { AnalyticsSummary } from "../../types";

export type AnalyticsFilters = {
  startDate: string;
  endDate: string;
  providers: string[];
  utilityTypes: string[];
  includeNeedsReview: boolean;
};

export type AnalyticsState = {
  filters: AnalyticsFilters;
  summary: AnalyticsSummary | null;
  // Stable option lists — only updated when a "load all" succeeds (no filters)
  allProviders: string[];
  allUtilityTypes: string[];
  loading: boolean;
  error: string | null;
};

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  startDate: "",
  endDate: "",
  providers: [],
  utilityTypes: [],
  includeNeedsReview: true,
};

const INITIAL_STATE: AnalyticsState = {
  filters: DEFAULT_ANALYTICS_FILTERS,
  summary: null,
  allProviders: [],
  allUtilityTypes: [],
  loading: false,
  error: null,
};

export type AnalyticsAction =
  | { type: "analytics/setFilters"; payload: Partial<AnalyticsFilters> }
  | { type: "analytics/resetFilters" }
  | { type: "analytics/loadStart" }
  | {
      type: "analytics/loadSuccess";
      payload: { summary: AnalyticsSummary; isUnfiltered: boolean };
    }
  | { type: "analytics/loadError"; payload: string };

export function analyticsReducer(
  state: AnalyticsState = INITIAL_STATE,
  action: AnalyticsAction,
): AnalyticsState {
  switch (action.type) {
    case "analytics/setFilters":
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };
    case "analytics/resetFilters":
      return {
        ...state,
        filters: DEFAULT_ANALYTICS_FILTERS,
      };
    case "analytics/loadStart":
      return { ...state, loading: true, error: null };
    case "analytics/loadSuccess": {
      const { summary, isUnfiltered } = action.payload;
      return {
        ...state,
        loading: false,
        summary,
        // Only refresh the stable option lists when we have an unfiltered result
        allProviders: isUnfiltered
          ? summary.totals_by_provider.map((p) => p.name)
          : state.allProviders,
        allUtilityTypes: isUnfiltered
          ? summary.totals_by_utility.map((u) => u.name)
          : state.allUtilityTypes,
      };
    }
    case "analytics/loadError":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}
