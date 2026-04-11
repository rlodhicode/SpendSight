import { combineReducers } from "redux";
import { billDetailReducer } from "./billDetailReducer";
import { billsReducer } from "./billsReducer";
import { jobsReducer } from "./jobsReducer";
import { uiReducer } from "./uiReducer";

export const rootReducer = combineReducers({
  uiState: uiReducer,
  jobsState: jobsReducer,
  billsState: billsReducer,
  billDetailState: billDetailReducer,
});
