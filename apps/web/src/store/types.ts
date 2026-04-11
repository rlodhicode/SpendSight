import type { AnyAction } from "redux";
import type { ThunkAction, ThunkDispatch } from "redux-thunk";
import type { rootReducer } from "./reducers";

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = ThunkDispatch<RootState, unknown, AnyAction>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  AnyAction
>;
