export type SnackbarSeverity = "success" | "info" | "warning" | "error";

export type SnackbarMessage = {
  id: string;
  message: string;
  severity: SnackbarSeverity;
  autoHideDuration: number | null;
};

export type UiState = {
  snackbars: SnackbarMessage[];
};

const INITIAL_STATE: UiState = {
  snackbars: [],
};

export type UiAction =
  | { type: "ui/enqueueSnackbar"; payload: SnackbarMessage }
  | { type: "ui/dequeueSnackbar"; payload: { id: string } }
  | { type: "ui/clearSnackbars" };

export function uiReducer(state: UiState = INITIAL_STATE, action: UiAction): UiState {
  switch (action.type) {
    case "ui/enqueueSnackbar":
      return {
        ...state,
        snackbars: [...state.snackbars, action.payload],
      };
    case "ui/dequeueSnackbar":
      return {
        ...state,
        snackbars: state.snackbars.filter((snackbar) => snackbar.id !== action.payload.id),
      };
    case "ui/clearSnackbars":
      return {
        ...state,
        snackbars: [],
      };
    default:
      return state;
  }
}
