import { api } from "../../api";
import type { AnalyticsFilters } from "../reducers/analyticsReducer";
import type { AppThunk } from "../types";
import { enqueueSnackbar } from "./uiActions";

export function setAnalyticsFilters(
  payload: Partial<AnalyticsFilters>,
): AppThunk {
  return (dispatch) => {
    dispatch({ type: "analytics/setFilters", payload });
  };
}

export function resetAnalyticsFilters(): AppThunk {
  return (dispatch) => {
    dispatch({ type: "analytics/resetFilters" });
  };
}

export function loadAnalytics(token: string): AppThunk<Promise<void>> {
  return (dispatch, getState) => {
    const { filters } = getState().analyticsState;
    const isUnfiltered =
      !filters.startDate &&
      !filters.endDate &&
      filters.providers.length === 0 &&
      filters.utilityTypes.length === 0 &&
      filters.includeNeedsReview;

    dispatch({ type: "analytics/loadStart" });

    return api
      .getSummary(token, {
        include_needs_review: filters.includeNeedsReview,
        provider: filters.providers.length > 0 ? filters.providers : undefined,
        utility_type:
          filters.utilityTypes.length > 0 ? filters.utilityTypes : undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
      })
      .then((summary) => {
        dispatch({
          type: "analytics/loadSuccess",
          payload: { summary, isUnfiltered },
        });
      })
      .catch((error: Error) => {
        dispatch({ type: "analytics/loadError", payload: error.message });
        dispatch(enqueueSnackbar(error.message, "error"));
      });
  };
}
