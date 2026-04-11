import { Alert, CircularProgress, Snackbar } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { dequeueSnackbar } from "../store/actions/uiActions";

export function AppSnackbarHost() {
  const dispatch = useAppDispatch();
  const snackbar = useAppSelector((state) => state.uiState.snackbars[0] ?? null);
  const isProcessingSnackbar = Boolean(snackbar?.message.startsWith("Processing job"));

  return (
    <Snackbar
      open={Boolean(snackbar)}
      autoHideDuration={snackbar?.autoHideDuration ?? null}
      onClose={() => {
        if (snackbar) {
          dispatch(dequeueSnackbar(snackbar.id));
        }
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity={snackbar?.severity ?? "info"}
        icon={isProcessingSnackbar ? <CircularProgress size={16} color="inherit" /> : undefined}
        onClose={() => {
          if (snackbar) {
            dispatch(dequeueSnackbar(snackbar.id));
          }
        }}
      >
        {snackbar?.message}
      </Alert>
    </Snackbar>
  );
}
