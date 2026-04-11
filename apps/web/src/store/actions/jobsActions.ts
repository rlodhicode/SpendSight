import { api } from "../../api";
import type { JobStatus } from "../../types";
import type { AppThunk } from "../types";
import { loadBills } from "./billsActions";
import { dequeueSnackbar, enqueueSnackbar } from "./uiActions";

export function trackJob(job: JobStatus): AppThunk {
  return (dispatch) => {
    const snackbarId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    dispatch({
      type: "ui/enqueueSnackbar",
      payload: {
        id: snackbarId,
        message: `Processing job ${job.job_id}...`,
        severity: "info",
        autoHideDuration: null,
      },
    });
    dispatch({
      type: "jobs/upsert",
      payload: {
        status: job,
        processingSnackbarId: snackbarId,
      },
    });
  };
}

export function pollActiveJobs(token: string, onTerminalStatus?: () => void): AppThunk<Promise<void>> {
  return (dispatch, getState) => {
    const activeJobs = Object.values(getState().jobsState.activeJobs);
    if (activeJobs.length === 0) {
      return Promise.resolve();
    }

    return Promise.all(
      activeJobs.map((activeJob) =>
        api
          .getJob(token, activeJob.status.job_id)
          .then((latest) => {
            const currentTracking = getState().jobsState.activeJobs[latest.job_id];
            dispatch({
              type: "jobs/upsert",
              payload: {
                status: latest,
                processingSnackbarId: currentTracking?.processingSnackbarId,
              },
            });
            if (latest.status === "queued" || latest.status === "processing") {
              return;
            }

            if (currentTracking?.processingSnackbarId) {
              dispatch(dequeueSnackbar(currentTracking.processingSnackbarId));
            }

            if (latest.status === "completed") {
              dispatch(enqueueSnackbar(`Job ${latest.job_id} completed successfully.`, "success"));
            } else if (latest.status === "needs_review") {
              dispatch(enqueueSnackbar(`Job ${latest.job_id} completed and needs review.`, "warning"));
            } else if (latest.status === "failed") {
              dispatch(enqueueSnackbar(latest.error_message ?? `Job ${latest.job_id} failed.`, "error"));
            }

            dispatch({
              type: "jobs/remove",
              payload: { jobId: latest.job_id },
            });
            dispatch(loadBills(token));
            if (onTerminalStatus) {
              onTerminalStatus();
            }
          })
          .catch((error: Error) => {
            dispatch(enqueueSnackbar(error.message, "error"));
          })
      )
    ).then(() => undefined);
  };
}
