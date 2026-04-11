import { api } from "../../api";
import type { BillUpdateRequest } from "../../types";
import type { AppThunk } from "../types";
import { enqueueSnackbar } from "./uiActions";

export function loadBillDetail(token: string, billId: string): AppThunk<Promise<void>> {
  return (dispatch) => {
    dispatch({
      type: "billDetail/loadStart",
      payload: { billId },
    });
    return Promise.all([api.getBillDetail(token, billId), api.getReviewDetail(token, billId)])
      .then(([detail, reviewDetail]) => {
        dispatch({
          type: "billDetail/loadSuccess",
          payload: {
            billId,
            detail,
            fieldConfidences: reviewDetail.field_confidences,
          },
        });
      })
      .catch((error: Error) => {
        dispatch({
          type: "billDetail/loadError",
          payload: error.message,
        });
        dispatch(enqueueSnackbar(error.message, "error"));
      });
  };
}

export function saveBillDetail(token: string, billId: string, payload: BillUpdateRequest): AppThunk<Promise<void>> {
  return (dispatch) => {
    return api
      .updateBill(token, billId, payload)
      .then((detail) => {
        dispatch({
          type: "billDetail/loadSuccess",
          payload: {
            billId,
            detail,
            fieldConfidences: [],
          },
        });
        dispatch(enqueueSnackbar("Bill updates saved.", "success"));
      })
      .catch((error: Error) => {
        dispatch(enqueueSnackbar(error.message, "error"));
      });
  };
}
