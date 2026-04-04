import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import BoltIcon from "@mui/icons-material/Bolt";
import styles from "./AuthForm.module.css";

interface AuthFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
  error?: string | null;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  onLogin,
  onRegister,
  error,
}) => {
  const [email, setEmail] = useState("student@example.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState<"login" | "register" | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("login");
    try {
      await onLogin(email, password);
    } finally {
      setLoading(null);
    }
  };

  const handleRegister = async () => {
    setLoading("register");
    try {
      await onRegister(email, password);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Box className={styles.wrapper}>
      <Box className={styles.hero}>
        <BoltIcon className={styles.heroIcon} />
        <Typography variant="h2" className={styles.heroTitle}>
          SpendSight
        </Typography>
        <Typography variant="body1" className={styles.heroSubtitle}>
          AI-powered utility bill analytics. Upload, extract, understand.
        </Typography>
      </Box>

      <Card className={styles.card} elevation={0}>
        <CardContent className={styles.cardContent}>
          <Typography variant="h4" className={styles.heading}>
            Welcome back
          </Typography>
          <Typography variant="body2" className={styles.subHeading}>
            Sign in to your account or create a new one
          </Typography>

          {error && (
            <Alert severity="error" className={styles.alert} role="alert">
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleLogin}
            className={styles.form}
            noValidate
          >
            <TextField
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <EmailIcon className={styles.fieldIcon} fontSize="small" />
                ),
              }}
              inputProps={{ "data-testid": "email-input" }}
            />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <LockIcon className={styles.fieldIcon} fontSize="small" />
                ),
              }}
              inputProps={{ "data-testid": "password-input" }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading !== null}
              data-testid="login-button"
              className={styles.loginBtn}
            >
              {loading === "login" ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                "Sign In"
              )}
            </Button>
          </Box>

          <Divider className={styles.divider}>
            <Typography variant="caption" className={styles.dividerText}>
              New here?
            </Typography>
          </Divider>

          <Button
            variant="outlined"
            size="large"
            fullWidth
            onClick={handleRegister}
            disabled={loading !== null}
            data-testid="register-button"
            className={styles.registerBtn}
          >
            {loading === "register" ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Create Account"
            )}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AuthForm;
