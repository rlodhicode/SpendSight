import { combineReducers } from "redux";
import { billDetailReducer } from "./billDetailReducer";
import { billsReducer } from "./billsReducer";
import { jobsReducer } from "./jobsReducer";
import { uiReducer } from "./uiReducer";
import { analyticsReducer } from "./analyticsReducer";

export const rootReducer = combineReducers({
  analyticsState: analyticsReducer,
  uiState: uiReducer,
  jobsState: jobsReducer,
  billsState: billsReducer,
  billDetailState: billDetailReducer,
});
