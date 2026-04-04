import React from "react";
import {
  AppBar,
  Box,
  Container,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import BoltIcon from "@mui/icons-material/Bolt";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
  isAuthed?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  onLogout,
  isAuthed,
}) => {
  return (
    <Box className={styles.root}>
      <AppBar position="sticky" elevation={0} className={styles.appBar}>
        <Toolbar className={styles.toolbar}>
          <Box className={styles.brand}>
            <BoltIcon className={styles.brandIcon} />
            <Typography variant="h6" className={styles.brandText}>
              SpendSight
            </Typography>
          </Box>
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
        </Toolbar>
      </AppBar>

      <Box component="main" className={styles.main}>
        <Container maxWidth="lg" className={styles.container}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
