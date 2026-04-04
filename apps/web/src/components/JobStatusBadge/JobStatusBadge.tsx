import React from "react";
import { Box, Chip, LinearProgress, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import styles from "./JobStatusBadge.module.css";

type JobStatusType = "queued" | "processing" | "completed" | "failed";

interface JobStatusBadgeProps {
  jobId: string;
  status: JobStatusType;
  errorMessage?: string | null;
}

const statusConfig: Record<
  JobStatusType,
  { label: string; color: "default" | "primary" | "success" | "error"; icon: React.ReactElement }
> = {
  queued: {
    label: "Queued",
    color: "default",
    icon: <HourglassTopIcon fontSize="small" />,
  },
  processing: {
    label: "Processing",
    color: "primary",
    icon: <AutorenewIcon fontSize="small" className={styles.spinning} />,
  },
  completed: {
    label: "Completed",
    color: "success",
    icon: <CheckCircleIcon fontSize="small" />,
  },
  failed: {
    label: "Failed",
    color: "error",
    icon: <ErrorIcon fontSize="small" />,
  },
};

export const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({
  jobId,
  status,
  errorMessage,
}) => {
  const config = statusConfig[status] ?? statusConfig.queued;
  const isInProgress = status === "queued" || status === "processing";

  return (
    <Box className={styles.wrapper} data-testid="job-status-badge">
      <Box className={styles.row}>
        <Typography variant="caption" className={styles.jobId}>
          Job <code className={styles.code}>{jobId.slice(0, 8)}…</code>
        </Typography>
        <Chip
          label={config.label}
          color={config.color}
          size="small"
          icon={config.icon}
          data-testid={`job-status-${status}`}
          className={styles.chip}
        />
      </Box>
      {isInProgress && (
        <LinearProgress
          className={styles.progress}
          color={status === "processing" ? "primary" : "inherit"}
          variant={status === "processing" ? "indeterminate" : "determinate"}
          value={0}
        />
      )}
      {status === "failed" && errorMessage && (
        <Typography variant="caption" className={styles.error} role="alert">
          {errorMessage}
        </Typography>
      )}
    </Box>
  );
};

export default JobStatusBadge;
