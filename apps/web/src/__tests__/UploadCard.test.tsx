import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { vi } from "vitest";
import { UploadCard } from "../components/UploadCard/UploadCard";
import theme from "../theme";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("UploadCard", () => {
  const mockUpload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders heading and dropzone", () => {
    renderWithTheme(<UploadCard onUpload={mockUpload} />);
    expect(screen.getByText("Upload Bill")).toBeInTheDocument();
    expect(screen.getByTestId("dropzone")).toBeInTheDocument();
  });

  it("renders utility type selector", () => {
    renderWithTheme(<UploadCard onUpload={mockUpload} />);
    expect(screen.getByTestId("utility-type-select")).toBeInTheDocument();
  });

  it("upload button is disabled when no file is selected", () => {
    renderWithTheme(<UploadCard onUpload={mockUpload} />);
    expect(screen.getByTestId("upload-button")).toBeDisabled();
  });

  it("upload button enables after a file is selected", async () => {
    renderWithTheme(<UploadCard onUpload={mockUpload} />);
    const input = screen.getByTestId("file-input");
    const file = new File(["content"], "bill.pdf", { type: "application/pdf" });

    await userEvent.upload(input, file);

    expect(screen.getByTestId("upload-button")).not.toBeDisabled();
  });

  it("shows file name after selection", async () => {
    renderWithTheme(<UploadCard onUpload={mockUpload} />);
    const input = screen.getByTestId("file-input");
    const file = new File(["content"], "my-bill.pdf", { type: "application/pdf" });

    await userEvent.upload(input, file);

    expect(screen.getByText("my-bill.pdf")).toBeInTheDocument();
  });

  it("calls onUpload with correct args when submitted", async () => {
    mockUpload.mockResolvedValue(undefined);
    renderWithTheme(<UploadCard onUpload={mockUpload} />);

    const input = screen.getByTestId("file-input");
    const file = new File(["content"], "bill.pdf", { type: "application/pdf" });
    await userEvent.upload(input, file);

    fireEvent.click(screen.getByTestId("upload-button"));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith("electricity", file);
    });
  });

  it("disables upload button while uploading", () => {
    renderWithTheme(<UploadCard onUpload={mockUpload} uploading={true} />);
    expect(screen.getByTestId("upload-button")).toBeDisabled();
  });

  it("displays error alert when error prop provided", () => {
    renderWithTheme(
      <UploadCard onUpload={mockUpload} error="File type not supported" />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("File type not supported");
  });

  it("dropzone is keyboard accessible", () => {
    renderWithTheme(<UploadCard onUpload={mockUpload} />);
    const dropzone = screen.getByTestId("dropzone");
    expect(dropzone).toHaveAttribute("tabIndex", "0");
    expect(dropzone).toHaveAttribute("role", "button");
  });
});
