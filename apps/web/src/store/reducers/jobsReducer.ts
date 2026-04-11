import type { JobStatus } from "../../types";

export type TrackedJob = {
  status: JobStatus;
  processingSnackbarId?: string;
};

export type JobsState = {
  activeJobs: Record<string, TrackedJob>;
};

const INITIAL_STATE: JobsState = {
  activeJobs: {},
};

export type JobsAction =
  | { type: "jobs/upsert"; payload: TrackedJob }
  | { type: "jobs/remove"; payload: { jobId: string } };

export function jobsReducer(state: JobsState = INITIAL_STATE, action: JobsAction): JobsState {
  switch (action.type) {
    case "jobs/upsert":
      return {
        ...state,
        activeJobs: {
          ...state.activeJobs,
          [action.payload.status.job_id]: action.payload,
        },
      };
    case "jobs/remove": {
      const next = { ...state.activeJobs };
      delete next[action.payload.jobId];
      return {
        ...state,
        activeJobs: next,
      };
    }
    default:
      return state;
  }
}
