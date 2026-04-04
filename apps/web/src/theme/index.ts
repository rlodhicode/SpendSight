import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1B4F72",
      light: "#2E86C1",
      dark: "#0E2D42",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#17A589",
      light: "#1ABC9C",
      dark: "#0E7A6A",
      contrastText: "#ffffff",
    },
    error: {
      main: "#C0392B",
      light: "#E74C3C",
    },
    warning: {
      main: "#D68910",
      light: "#F0B429",
    },
    success: {
      main: "#1D8348",
      light: "#27AE60",
    },
    background: {
      default: "#F0F4F8",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1A2533",
      secondary: "#4A6072",
    },
    divider: "#D5E3EE",
  },
  typography: {
    fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 700,
      letterSpacing: "-0.5px",
    },
    h2: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 700,
      letterSpacing: "-0.3px",
    },
    h3: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 700,
    },
    h4: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 600,
      letterSpacing: "0.3px",
      textTransform: "none",
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    "none",
    "0 1px 3px rgba(27,79,114,0.06), 0 1px 2px rgba(27,79,114,0.04)",
    "0 3px 6px rgba(27,79,114,0.08), 0 2px 4px rgba(27,79,114,0.06)",
    "0 6px 12px rgba(27,79,114,0.1), 0 4px 6px rgba(27,79,114,0.07)",
    "0 10px 20px rgba(27,79,114,0.12), 0 4px 8px rgba(27,79,114,0.08)",
    "0 14px 28px rgba(27,79,114,0.14), 0 6px 10px rgba(27,79,114,0.1)",
    "0 18px 36px rgba(27,79,114,0.15), 0 8px 12px rgba(27,79,114,0.1)",
    "0 20px 40px rgba(27,79,114,0.16), 0 10px 14px rgba(27,79,114,0.1)",
    "0 22px 44px rgba(27,79,114,0.17), 0 10px 16px rgba(27,79,114,0.1)",
    "0 24px 48px rgba(27,79,114,0.18), 0 12px 18px rgba(27,79,114,0.1)",
    "0 26px 52px rgba(27,79,114,0.18), 0 12px 20px rgba(27,79,114,0.11)",
    "0 28px 56px rgba(27,79,114,0.18), 0 14px 22px rgba(27,79,114,0.11)",
    "0 30px 60px rgba(27,79,114,0.19), 0 14px 24px rgba(27,79,114,0.11)",
    "0 32px 64px rgba(27,79,114,0.19), 0 16px 26px rgba(27,79,114,0.12)",
    "0 34px 68px rgba(27,79,114,0.2), 0 16px 28px rgba(27,79,114,0.12)",
    "0 36px 72px rgba(27,79,114,0.2), 0 18px 30px rgba(27,79,114,0.12)",
    "0 38px 76px rgba(27,79,114,0.2), 0 18px 32px rgba(27,79,114,0.13)",
    "0 40px 80px rgba(27,79,114,0.21), 0 20px 34px rgba(27,79,114,0.13)",
    "0 42px 84px rgba(27,79,114,0.21), 0 20px 36px rgba(27,79,114,0.13)",
    "0 44px 88px rgba(27,79,114,0.22), 0 22px 38px rgba(27,79,114,0.14)",
    "0 46px 92px rgba(27,79,114,0.22), 0 22px 40px rgba(27,79,114,0.14)",
    "0 48px 96px rgba(27,79,114,0.23), 0 24px 42px rgba(27,79,114,0.14)",
    "0 50px 100px rgba(27,79,114,0.23), 0 24px 44px rgba(27,79,114,0.15)",
    "0 52px 104px rgba(27,79,114,0.24), 0 26px 46px rgba(27,79,114,0.15)",
    "0 54px 108px rgba(27,79,114,0.24), 0 26px 48px rgba(27,79,114,0.15)",
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "10px 22px",
          fontSize: "0.9rem",
          transition: "all 0.2s ease",
          "&:hover": {
            transform: "translateY(-1px)",
          },
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #1B4F72 0%, #2E86C1 100%)",
          boxShadow: "0 4px 14px rgba(27,79,114,0.3)",
          "&:hover": {
            boxShadow: "0 6px 20px rgba(27,79,114,0.4)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: "1px solid #D5E3EE",
          boxShadow: "0 2px 12px rgba(27,79,114,0.07)",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 10,
            "& fieldset": {
              borderColor: "#C8D8E8",
            },
            "&:hover fieldset": {
              borderColor: "#2E86C1",
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: "0.75rem",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            fontWeight: 700,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            color: "#4A6072",
            borderBottom: "2px solid #D5E3EE",
            backgroundColor: "#F7FAFC",
          },
        },
      },
    },
  },
});

export default theme;
