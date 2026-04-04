import React from "react";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { StatCard } from "../components/StatCard/StatCard";
import theme from "../theme";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("StatCard", () => {
  it("renders title and value", () => {
    renderWithTheme(
      <StatCard title="Total Spend" value="$120.00" icon={<AttachMoneyIcon />} />
    );
    expect(screen.getByText("Total Spend")).toBeInTheDocument();
    expect(screen.getByText("$120.00")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    renderWithTheme(
      <StatCard
        title="Total"
        value="$0"
        icon={<AttachMoneyIcon />}
        subtitle="Last 12 months"
      />
    );
    expect(screen.getByText("Last 12 months")).toBeInTheDocument();
  });

  it("shows skeleton when loading", () => {
    renderWithTheme(
      <StatCard
        title="Total"
        value="$200"
        icon={<AttachMoneyIcon />}
        loading={true}
      />
    );
    // Value should not appear while loading
    expect(screen.queryByText("$200")).not.toBeInTheDocument();
  });

  it("renders with data-testid stat-card", () => {
    renderWithTheme(
      <StatCard title="Test" value="42" icon={<AttachMoneyIcon />} />
    );
    expect(screen.getByTestId("stat-card")).toBeInTheDocument();
  });

  it("renders numeric value as string", () => {
    renderWithTheme(
      <StatCard title="Bills" value={7} icon={<AttachMoneyIcon />} />
    );
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});
