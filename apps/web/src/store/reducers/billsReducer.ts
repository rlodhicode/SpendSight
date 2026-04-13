import type {
  BillsSortBy,
  BillsSortOrder,
  PaginatedBillsResponse,
} from "../../types";

export type BillsSearchForm = {
  page: number;
  pageSize: number;
  sortBy: BillsSortBy;
  sortOrder: BillsSortOrder;
  /** Free-text search: matched against public_id prefix or provider name */
  searchQuery: string;
  utilityFilter: string;
  reviewStatusFilter: string;
  startDate: string;
  endDate: string;
};

export type BillsState = {
  searchForm: BillsSearchForm;
  result: PaginatedBillsResponse | null;
  loading: boolean;
  error: string | null;
};

export const DEFAULT_BILLS_SEARCH_FORM: BillsSearchForm = {
  page: 0,
  pageSize: 10,
  sortBy: "billing_period_end",
  sortOrder: "desc",
  searchQuery: "",
  utilityFilter: "",
  reviewStatusFilter: "",
  startDate: "",
  endDate: "",
};

const INITIAL_STATE: BillsState = {
  searchForm: DEFAULT_BILLS_SEARCH_FORM,
  result: null,
  loading: false,
  error: null,
};

export type BillsAction =
  | { type: "bills/setSearchForm"; payload: Partial<BillsSearchForm> }
  | { type: "bills/loadStart" }
  | { type: "bills/loadSuccess"; payload: PaginatedBillsResponse }
  | { type: "bills/loadError"; payload: string };

export function billsReducer(
  state: BillsState = INITIAL_STATE,
  action: BillsAction,
): BillsState {
  switch (action.type) {
    case "bills/setSearchForm":
      return {
        ...state,
        searchForm: {
          ...state.searchForm,
          ...action.payload,
        },
      };
    case "bills/loadStart":
      return { ...state, loading: true, error: null };
    case "bills/loadSuccess":
      return { ...state, loading: false, result: action.payload };
    case "bills/loadError":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}
