import React from "react";
import {
  AppBar,
  Box,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import BoltIcon from "@mui/icons-material/Bolt";
import { NavLink, useLocation } from "react-router-dom";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
  isAuthed?: boolean;
}

// Pages that manage their own height and should not have container padding
const FULL_HEIGHT_PATHS = ["/bills"];

export const Layout: React.FC<LayoutProps> = ({
  children,
  onLogout,
  isAuthed,
}) => {
  const location = useLocation();
  const isFullHeight = FULL_HEIGHT_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith("/bills/"),
  );

  return (
    <Box
      className={styles.root}
      sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <AppBar position="sticky" elevation={0} className={styles.appBar}>
        <Toolbar className={styles.toolbar}>
          <Box className={styles.brand}>
            <BoltIcon className={styles.brandIcon} />
            <Typography variant="h6" className={styles.brandText}>
              SpendSight
            </Typography>
          </Box>
          <Box className={styles.rightControls}>
            {isAuthed && (
              <Stack direction="row" spacing={1} className={styles.navLinks}>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/analytics"
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
                  }
                >
                  Analytics
                </NavLink>
                <NavLink
                  to="/bills"
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
                  }
                >
                  Bills
                </NavLink>
              </Stack>
            )}
            {isAuthed && onLogout && (
              <Tooltip title="Sign out">
                <IconButton
                  onClick={onLogout}
                  className={styles.logoutBtn}
                  aria-label="Sign out"
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isFullHeight ? (
          // Full-height pages: no container, no padding, just px for breathing room
          <Box
            sx={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {children}
          </Box>
        ) : (
          <Container maxWidth="lg" className={styles.container}>
            {children}
          </Container>
        )}
      </Box>
    </Box>
  );
};

export default Layout;
