import type { JobStatus } from "../types";
import { request } from "./client";

export function getJob(token: string, jobId: string): Promise<JobStatus> {
  return request<JobStatus>(`/api/v1/jobs/${jobId}`, { token });
}
