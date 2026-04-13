import { api } from "../../api";
import type { BillsSearchForm } from "../reducers/billsReducer";
import type { AppThunk } from "../types";
import { enqueueSnackbar } from "./uiActions";

export function setBillsSearchForm(
  payload: Partial<BillsSearchForm>,
): AppThunk {
  return (dispatch) => {
    dispatch({ type: "bills/setSearchForm", payload });
  };
}

export function loadBills(token: string): AppThunk<Promise<void>> {
  return (dispatch, getState) => {
    const form = getState().billsState.searchForm;
    dispatch({ type: "bills/loadStart" });

    // Determine whether the search query looks like a public bill ID (e.g. "E00012")
    // or a free-text provider search. A public ID starts with a letter followed by digits.
    const q = form.searchQuery.trim();
    const looksLikePublicId = /^[A-Za-z]\d+/.test(q);

    return api
      .getBills(token, {
        page: form.page + 1,
        page_size: form.pageSize,
        sort_by: form.sortBy,
        sort_order: form.sortOrder,
        // Route the search query to the right API param
        provider: !looksLikePublicId && q ? q : undefined,
        // public_id prefix search not directly supported by API — handled client-side below
        utility_type: form.utilityFilter || undefined,
        review_status: form.reviewStatusFilter || undefined,
        start_date: form.startDate || undefined,
        end_date: form.endDate || undefined,
      })
      .then((result) => {
        // If query looks like a public ID, filter client-side on the current page
        const items =
          looksLikePublicId && q
            ? result.items.filter((b) =>
                b.public_id.toLowerCase().startsWith(q.toLowerCase()),
              )
            : result.items;

        dispatch({
          type: "bills/loadSuccess",
          payload: { ...result, items },
        });
      })
      .catch((error: Error) => {
        dispatch({ type: "bills/loadError", payload: error.message });
        dispatch(enqueueSnackbar(error.message, "error"));
      });
  };
}
