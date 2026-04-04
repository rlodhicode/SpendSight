import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Grid, Snackbar } from "@mui/material";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ReceiptIcon from "@mui/icons-material/Receipt";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

import { api } from "./api";
import { AuthForm } from "./components/AuthForm";
import { BillsTable } from "./components/BillsTable";
import { JobStatusBadge } from "./components/JobStatusBadge";
import { Layout } from "./components/Layout";
import { ProviderList } from "./components/ProviderList";
import { SpendChart } from "./components/Chart";
import { StatCard } from "./components/StatCard";
import { UploadCard } from "./components/UploadCard";
import type { AnalyticsSummary, BillRecord, JobStatus } from "./types";

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("spendsight_token")
  );
  const [job, setJob] = useState<JobStatus | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const isAuthed = useMemo(() => Boolean(token), [token]);

  useEffect(() => {
    if (!token) return;
    void loadData(token);
  }, [token]);

  // Poll active jobs
  useEffect(() => {
    if (
      !token ||
      !job ||
      (job.status !== "queued" && job.status !== "processing")
    )
      return;
    const interval = window.setInterval(async () => {
      try {
        const latest = await api.getJob(token, job.job_id);
        setJob(latest);
        if (latest.status === "completed") {
          window.clearInterval(interval);
          setSnackbar("Bill processed successfully!");
          await loadData(token);
        } else if (latest.status === "failed") {
          window.clearInterval(interval);
          setError(latest.error_message ?? "Processing failed");
        }
      } catch (err) {
        window.clearInterval(interval);
        setError((err as Error).message);
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [token, job]);

  async function loadData(activeToken: string) {
    setDataLoading(true);
    try {
      const [summaryResult, billsResult] = await Promise.all([
        api.getSummary(activeToken),
        api.getBills(activeToken),
      ]);
      setSummary(summaryResult);
      setBills(billsResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDataLoading(false);
    }
  }

  const handleLogin = async (email: string, password: string) => {
    setError(null);
    const auth = await api.login(email, password);
    localStorage.setItem("spendsight_token", auth.access_token);
    setToken(auth.access_token);
  };

  const handleRegister = async (email: string, password: string) => {
    setError(null);
    const auth = await api.register(email, password);
    localStorage.setItem("spendsight_token", auth.access_token);
    setToken(auth.access_token);
  };

  const handleUpload = async (utilityType: string, file: File) => {
    if (!token) return;
    setUploading(true);
    setError(null);
    try {
      const upload = await api.uploadBill(token, utilityType, file);
      setJob({
        job_id: upload.job_id,
        status: upload.status as JobStatus["status"],
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("spendsight_token");
    setToken(null);
    setSummary(null);
    setBills([]);
    setJob(null);
    setError(null);
  };

  return (
    <Layout isAuthed={isAuthed} onLogout={handleLogout}>
      {!isAuthed ? (
        <AuthForm
          onLogin={handleLogin}
          onRegister={handleRegister}
          error={error}
        />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Stats row */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Total Spend"
                value={`$${summary?.total_spend.toFixed(2) ?? "0.00"}`}
                icon={<AttachMoneyIcon />}
                color="primary"
                loading={dataLoading}
                subtitle="Last 12 months"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Average Bill"
                value={`$${summary?.average_bill.toFixed(2) ?? "0.00"}`}
                icon={<TrendingUpIcon />}
                color="secondary"
                loading={dataLoading}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Bills Processed"
                value={summary?.bills_count ?? 0}
                icon={<ReceiptIcon />}
                color="success"
                loading={dataLoading}
              />
            </Grid>
          </Grid>

          {/* Upload + Job status */}
          <Grid container spacing={2} alignItems="stretch">
            <Grid item xs={12} md={6}>
              <UploadCard
                onUpload={handleUpload}
                uploading={uploading}
                error={error}
              />
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {job && (
                <JobStatusBadge
                  jobId={job.job_id}
                  status={job.status}
                  errorMessage={job.error_message}
                />
              )}
              <ProviderList
                providers={summary?.totals_by_provider ?? []}
                totalSpend={summary?.total_spend ?? 0}
                loading={dataLoading}
              />
            </Grid>
          </Grid>

          {/* Chart */}
          <SpendChart
            monthlyTotals={summary?.totals_by_month ?? []}
            loading={dataLoading}
          />

          {/* Bills table */}
          <BillsTable bills={bills} loading={dataLoading} />
        </Box>
      )}

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSnackbar(null)}>
          {snackbar}
        </Alert>
      </Snackbar>
    </Layout>
  );
}

export default App;
