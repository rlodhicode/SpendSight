import React from "react";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { BillsTable } from "../components/BillsTable/BillsTable";
import theme from "../theme";
import type { BillRecord } from "../types";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const MOCK_BILLS: BillRecord[] = [
  {
    id: "1",
    public_id: "E00001",
    utility_type: "electricity",
    provider_name: "Xcel Energy",
    billing_period_start: "2026-01-01",
    billing_period_end: "2026-01-31",
    total_amount_due: 123.45,
    currency: "USD",
    confidence_score: 0.95,
    extracted_at: "2026-02-01T00:00:00Z",
  },
  {
    id: "2",
    public_id: "W00001",
    utility_type: "water",
    provider_name: "Denver Water",
    billing_period_start: "2026-01-01",
    billing_period_end: "2026-01-31",
    total_amount_due: 45.0,
    currency: "USD",
    confidence_score: 0.72,
    extracted_at: "2026-02-01T00:00:00Z",
  },
];

describe("BillsTable", () => {
  it("renders the heading", () => {
    renderWithTheme(<BillsTable bills={[]} />);
    expect(screen.getByText("Recent Bills")).toBeInTheDocument();
  });

  it("shows empty state when no bills", () => {
    renderWithTheme(<BillsTable bills={[]} />);
    expect(screen.getByTestId("bills-empty")).toBeInTheDocument();
    expect(screen.getByText(/No bills yet/i)).toBeInTheDocument();
  });

  it("renders a row per bill", () => {
    renderWithTheme(<BillsTable bills={MOCK_BILLS} />);
    expect(screen.getAllByTestId("bill-row")).toHaveLength(2);
  });

  it("displays provider names", () => {
    renderWithTheme(<BillsTable bills={MOCK_BILLS} />);
    expect(screen.getByText("Xcel Energy")).toBeInTheDocument();
    expect(screen.getByText("Denver Water")).toBeInTheDocument();
  });

  it("displays formatted amounts", () => {
    renderWithTheme(<BillsTable bills={MOCK_BILLS} />);
    expect(screen.getByText("$123.45")).toBeInTheDocument();
    expect(screen.getByText("$45.00")).toBeInTheDocument();
  });

  it("displays confidence scores as percentages", () => {
    renderWithTheme(<BillsTable bills={MOCK_BILLS} />);
    expect(screen.getByText("95%")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
  });

  it("renders skeleton rows when loading", () => {
    renderWithTheme(<BillsTable bills={[]} loading={true} />);
    // Table should be present but no bill rows
    expect(screen.queryByTestId("bills-empty")).not.toBeInTheDocument();
    expect(screen.queryByTestId("bill-row")).not.toBeInTheDocument();
  });

  it("shows record count badge", () => {
    renderWithTheme(<BillsTable bills={MOCK_BILLS} />);
    expect(screen.getByText("2 records")).toBeInTheDocument();
  });

  it("shows singular record label for one bill", () => {
    renderWithTheme(<BillsTable bills={[MOCK_BILLS[0]]} />);
    expect(screen.getByText("1 record")).toBeInTheDocument();
  });
});
