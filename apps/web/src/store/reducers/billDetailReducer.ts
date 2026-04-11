import type { BillDetail, FieldConfidence } from "../../types";

export type BillDetailState = {
  selectedBillId: string | null;
  detail: BillDetail | null;
  fieldConfidences: FieldConfidence[];
  loading: boolean;
  error: string | null;
};

const INITIAL_STATE: BillDetailState = {
  selectedBillId: null,
  detail: null,
  fieldConfidences: [],
  loading: false,
  error: null,
};

export type BillDetailAction =
  | { type: "billDetail/loadStart"; payload: { billId: string } }
  | { type: "billDetail/loadSuccess"; payload: { billId: string; detail: BillDetail; fieldConfidences: FieldConfidence[] } }
  | { type: "billDetail/loadError"; payload: string };

export function billDetailReducer(
  state: BillDetailState = INITIAL_STATE,
  action: BillDetailAction
): BillDetailState {
  switch (action.type) {
    case "billDetail/loadStart":
      return {
        ...state,
        selectedBillId: action.payload.billId,
        loading: true,
        error: null,
      };
    case "billDetail/loadSuccess":
      return {
        ...state,
        loading: false,
        selectedBillId: action.payload.billId,
        detail: action.payload.detail,
        fieldConfidences: action.payload.fieldConfidences,
      };
    case "billDetail/loadError":
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
}
