import { api } from "../../api";
import type { BillsSearchForm } from "../reducers/billsReducer";
import type { AppThunk } from "../types";
import { enqueueSnackbar } from "./uiActions";

export function setBillsSearchForm(payload: Partial<BillsSearchForm>): AppThunk {
  return (dispatch) => {
    dispatch({
      type: "bills/setSearchForm",
      payload,
    });
  };
}

export function loadBills(token: string): AppThunk<Promise<void>> {
  return (dispatch, getState) => {
    const form = getState().billsState.searchForm;
    dispatch({ type: "bills/loadStart" });
    return api
      .getBills(token, {
        page: form.page + 1,
        page_size: form.pageSize,
        sort_by: form.sortBy,
        sort_order: form.sortOrder,
        provider: form.providerFilter || undefined,
        utility_type: form.utilityFilter || undefined,
        review_status: form.reviewStatusFilter || undefined,
        start_date: form.startDate || undefined,
        end_date: form.endDate || undefined,
      })
      .then((result) => {
        dispatch({
          type: "bills/loadSuccess",
          payload: result,
        });
      })
      .catch((error: Error) => {
        dispatch({
          type: "bills/loadError",
          payload: error.message,
        });
        dispatch(enqueueSnackbar(error.message, "error"));
      });
  };
}
