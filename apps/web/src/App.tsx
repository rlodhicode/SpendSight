import { useMemo, useState } from "react";
import { Alert, Box } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";

import { api } from "./api";
import { AuthForm } from "./components/AuthForm";
import { Layout } from "./components/Layout";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { BillDetailPage } from "./pages/BillDetailPage";
import { BillsPage } from "./pages/BillsPage";
import { DashboardPage } from "./pages/DashboardPage";

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("spendsight_token"));
  const [authError, setAuthError] = useState<string | null>(null);

  const isAuthed = useMemo(() => Boolean(token), [token]);

  const handleLogin = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const auth = await api.login(email, password);
      localStorage.setItem("spendsight_token", auth.access_token);
      setToken(auth.access_token);
    } catch (err) {
      setAuthError((err as Error).message);
    }
  };

  const handleRegister = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const auth = await api.register(email, password);
      localStorage.setItem("spendsight_token", auth.access_token);
      setToken(auth.access_token);
    } catch (err) {
      setAuthError((err as Error).message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("spendsight_token");
    setToken(null);
    setAuthError(null);
  };

  if (!isAuthed || !token) {
    return (
      <Layout isAuthed={false}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {authError ? <Alert severity="error">{authError}</Alert> : null}
          <AuthForm onLogin={handleLogin} onRegister={handleRegister} error={authError} />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout isAuthed={isAuthed} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<DashboardPage token={token} />} />
        <Route path="/analytics" element={<AnalyticsPage token={token} />} />
        <Route path="/bills" element={<BillsPage token={token} />} />
        <Route path="/bills/:billId" element={<BillDetailPage token={token} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
