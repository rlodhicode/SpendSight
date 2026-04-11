import type { AppThunk } from "../types";
import type { SnackbarSeverity } from "../reducers/uiReducer";

export function enqueueSnackbar(
  message: string,
  severity: SnackbarSeverity = "info",
  autoHideDuration: number | null = 4000
): AppThunk<string> {
  return (dispatch) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    dispatch({
      type: "ui/enqueueSnackbar",
      payload: {
        id,
        message,
        severity,
        autoHideDuration,
      },
    });
    return id;
  };
}

export function dequeueSnackbar(id: string): AppThunk {
  return (dispatch) => {
    dispatch({
      type: "ui/dequeueSnackbar",
      payload: { id },
    });
  };
}
