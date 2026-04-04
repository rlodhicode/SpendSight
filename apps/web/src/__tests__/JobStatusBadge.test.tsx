import React from "react";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { JobStatusBadge } from "../components/JobStatusBadge/JobStatusBadge";
import theme from "../theme";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("JobStatusBadge", () => {
  const JOB_ID = "abc12345-0000-0000-0000-000000000000";

  it("renders job id (truncated)", () => {
    renderWithTheme(
      <JobStatusBadge jobId={JOB_ID} status="queued" />
    );
    expect(screen.getByText(/abc12345/)).toBeInTheDocument();
  });

  it("shows Queued chip for queued status", () => {
    renderWithTheme(<JobStatusBadge jobId={JOB_ID} status="queued" />);
    expect(screen.getByTestId("job-status-queued")).toBeInTheDocument();
  });

  it("shows Processing chip for processing status", () => {
    renderWithTheme(<JobStatusBadge jobId={JOB_ID} status="processing" />);
    expect(screen.getByTestId("job-status-processing")).toBeInTheDocument();
  });

  it("shows Completed chip for completed status", () => {
    renderWithTheme(<JobStatusBadge jobId={JOB_ID} status="completed" />);
    expect(screen.getByTestId("job-status-completed")).toBeInTheDocument();
  });

  it("shows Failed chip for failed status", () => {
    renderWithTheme(<JobStatusBadge jobId={JOB_ID} status="failed" />);
    expect(screen.getByTestId("job-status-failed")).toBeInTheDocument();
  });

  it("displays error message when status is failed and errorMessage provided", () => {
    renderWithTheme(
      <JobStatusBadge
        jobId={JOB_ID}
        status="failed"
        errorMessage="Model returned invalid JSON"
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Model returned invalid JSON"
    );
  });

  it("does not display error message for non-failed status", () => {
    renderWithTheme(
      <JobStatusBadge
        jobId={JOB_ID}
        status="completed"
        errorMessage="some error"
      />
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders progress bar for in-progress statuses", () => {
    const { rerender } = renderWithTheme(
      <JobStatusBadge jobId={JOB_ID} status="processing" />
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <JobStatusBadge jobId={JOB_ID} status="queued" />
      </ThemeProvider>
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("does not render progress bar for terminal statuses", () => {
    renderWithTheme(<JobStatusBadge jobId={JOB_ID} status="completed" />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
