import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { vi } from "vitest";
import { AuthForm } from "../components/AuthForm/AuthForm";
import theme from "../theme";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("AuthForm", () => {
  const mockLogin = vi.fn();
  const mockRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email and password fields", () => {
    renderWithTheme(
      <AuthForm onLogin={mockLogin} onRegister={mockRegister} />
    );
    expect(screen.getByTestId("email-input")).toBeInTheDocument();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
  });

  it("renders login and register buttons", () => {
    renderWithTheme(
      <AuthForm onLogin={mockLogin} onRegister={mockRegister} />
    );
    expect(screen.getByTestId("login-button")).toBeInTheDocument();
    expect(screen.getByTestId("register-button")).toBeInTheDocument();
  });

  it("calls onLogin with entered credentials on form submit", async () => {
    mockLogin.mockResolvedValue(undefined);
    renderWithTheme(
      <AuthForm onLogin={mockLogin} onRegister={mockRegister} />
    );

    await userEvent.clear(screen.getByTestId("email-input"));
    await userEvent.type(screen.getByTestId("email-input"), "user@test.com");
    await userEvent.clear(screen.getByTestId("password-input"));
    await userEvent.type(screen.getByTestId("password-input"), "secret123");

    fireEvent.click(screen.getByTestId("login-button"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("user@test.com", "secret123");
    });
  });

  it("calls onRegister when register button is clicked", async () => {
    mockRegister.mockResolvedValue(undefined);
    renderWithTheme(
      <AuthForm onLogin={mockLogin} onRegister={mockRegister} />
    );

    fireEvent.click(screen.getByTestId("register-button"));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    });
  });

  it("displays error alert when error prop is provided", () => {
    renderWithTheme(
      <AuthForm
        onLogin={mockLogin}
        onRegister={mockRegister}
        error="Invalid credentials"
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
  });

  it("does not display error alert when no error", () => {
    renderWithTheme(
      <AuthForm onLogin={mockLogin} onRegister={mockRegister} />
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables buttons while login is loading", async () => {
    mockLogin.mockImplementation(
      () => new Promise((res) => setTimeout(res, 500))
    );
    renderWithTheme(
      <AuthForm onLogin={mockLogin} onRegister={mockRegister} />
    );

    fireEvent.click(screen.getByTestId("login-button"));

    await waitFor(() => {
      expect(screen.getByTestId("login-button")).toBeDisabled();
      expect(screen.getByTestId("register-button")).toBeDisabled();
    });
  });
});
