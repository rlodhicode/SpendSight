import React from "react";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { ProviderList } from "../components/ProviderList/ProviderList";
import theme from "../theme";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const MOCK_PROVIDERS = [
  { name: "Xcel Energy", total: 450.0 },
  { name: "Denver Water", total: 120.0 },
  { name: "CenturyLink", total: 80.0 },
];

describe("ProviderList", () => {
  it("renders heading", () => {
    renderWithTheme(
      <ProviderList providers={[]} totalSpend={0} />
    );
    expect(screen.getByText("By Provider")).toBeInTheDocument();
  });

  it("shows empty message when no providers", () => {
    renderWithTheme(
      <ProviderList providers={[]} totalSpend={0} />
    );
    expect(screen.getByText(/No provider data yet/i)).toBeInTheDocument();
  });

  it("renders a row per provider", () => {
    renderWithTheme(
      <ProviderList providers={MOCK_PROVIDERS} totalSpend={650} />
    );
    expect(screen.getAllByTestId("provider-item")).toHaveLength(3);
  });

  it("displays provider names", () => {
    renderWithTheme(
      <ProviderList providers={MOCK_PROVIDERS} totalSpend={650} />
    );
    expect(screen.getByText("Xcel Energy")).toBeInTheDocument();
    expect(screen.getByText("Denver Water")).toBeInTheDocument();
    expect(screen.getByText("CenturyLink")).toBeInTheDocument();
  });

  it("displays provider totals", () => {
    renderWithTheme(
      <ProviderList providers={MOCK_PROVIDERS} totalSpend={650} />
    );
    expect(screen.getByText("$450.00")).toBeInTheDocument();
    expect(screen.getByText("$120.00")).toBeInTheDocument();
  });

  it("renders progress bars for each provider", () => {
    renderWithTheme(
      <ProviderList providers={MOCK_PROVIDERS} totalSpend={650} />
    );
    expect(screen.getAllByRole("progressbar")).toHaveLength(3);
  });

  it("renders skeleton when loading", () => {
    renderWithTheme(
      <ProviderList providers={[]} totalSpend={0} loading={true} />
    );
    expect(screen.queryByText(/No provider data yet/i)).not.toBeInTheDocument();
  });
});
