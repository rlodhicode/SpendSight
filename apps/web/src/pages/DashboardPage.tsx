import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Snackbar,
  TextField,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ReceiptIcon from "@mui/icons-material/Receipt";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

import { api } from "../api";
import { BillsTable } from "../components/BillsTable";
import { JobStatusBadge } from "../components/JobStatusBadge";
import { ProviderList } from "../components/ProviderList";
import { ReviewQueueCard } from "../components/ReviewQueueCard";
import { SpendChart } from "../components/Chart";
import { StatCard } from "../components/StatCard";
import { UploadCard } from "../components/UploadCard";
import type {
  AnalyticsSummary,
  BillRecord,
  JobStatus,
  ReviewDetail,
  ReviewQueueItem,
  ReviewUpdateRequest,
} from "../types";

type DashboardPageProps = {
  token: string;
};

export function DashboardPage({ token }: DashboardPageProps) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "warning">("success");
  const [reviewItems, setReviewItems] = useState<ReviewQueueItem[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewDetail, setReviewDetail] = useState<ReviewDetail | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewUpdateRequest>({});

  useEffect(() => {
    void loadData(token);
  }, [token]);

  useEffect(() => {
    if (!job || (job.status !== "queued" && job.status !== "processing")) {
      return;
    }
    const interval = window.setInterval(async () => {
      try {
        const latest = await api.getJob(token, job.job_id);
        setJob(latest);
        if (latest.status === "completed") {
          window.clearInterval(interval);
          setSnackbarSeverity("success");
          setSnackbar("Bill processed successfully!");
          await loadData(token);
        } else if (latest.status === "needs_review") {
          window.clearInterval(interval);
          setSnackbarSeverity("warning");
          setSnackbar("Bill processed, but needs quick human review.");
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
    setReviewLoading(true);
    try {
      const [summaryResult, billsResult, reviewQueue] = await Promise.all([
        api.getSummary(activeToken, { months: 12, include_needs_review: true }),
        api.getBills(activeToken, { page: 1, page_size: 8, sort_by: "billing_period_end", sort_order: "desc" }),
        api.getReviewQueue(activeToken, 1, 5),
      ]);
      setSummary(summaryResult);
      setBills(billsResult.items);
      setReviewItems(reviewQueue.items);
      setReviewTotal(reviewQueue.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDataLoading(false);
      setReviewLoading(false);
    }
  }

  const handleOpenReview = async (billId: string) => {
    try {
      const detail = await api.getReviewDetail(token, billId);
      setReviewDetail(detail);
      setReviewForm({
        provider_name: detail.bill.provider_name,
        utility_type: detail.bill.utility_type,
        account_number: detail.bill.account_number ?? undefined,
        total_amount_due: detail.bill.total_amount_due,
        usage_amount: detail.bill.usage_amount ?? undefined,
      });
      setReviewDialogOpen(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSaveReview = async () => {
    if (!reviewDetail) {
      return;
    }
    setReviewSubmitting(true);
    try {
      await api.updateReview(token, reviewDetail.bill.id, reviewForm);
      setSnackbarSeverity("success");
      setSnackbar("Review updates saved.");
      setReviewDialogOpen(false);
      setReviewDetail(null);
      await loadData(token);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleUpload = async (utilityType: string, file: File) => {
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}

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

      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} md={6}>
          <UploadCard
            onUpload={handleUpload}
            uploading={uploading}
            error={error}
          />
        </Grid>
        <Grid item xs={12} md={6} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {job ? (
            <JobStatusBadge
              jobId={job.job_id}
              status={job.status}
              errorMessage={job.error_message}
            />
          ) : null}
          <ProviderList
            providers={summary?.totals_by_provider ?? []}
            totalSpend={summary?.total_spend ?? 0}
            loading={dataLoading}
          />
          <ReviewQueueCard
            items={reviewItems}
            total={reviewTotal}
            loading={reviewLoading}
            onOpenReview={handleOpenReview}
          />
        </Grid>
      </Grid>

      <SpendChart
        monthlyTotals={summary?.totals_by_month ?? []}
        loading={dataLoading}
      />

      <BillsTable bills={bills} loading={dataLoading} />
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button component={RouterLink} to="/bills" variant="outlined">
          View All Bills
        </Button>
      </Box>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbarSeverity} onClose={() => setSnackbar(null)}>
          {snackbar}
        </Alert>
      </Snackbar>

      <Dialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Review Extracted Bill</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Provider Name"
            value={reviewForm.provider_name ?? ""}
            onChange={(e) =>
              setReviewForm((prev) => ({ ...prev, provider_name: e.target.value }))
            }
            fullWidth
          />
          <TextField
            label="Utility Type"
            value={reviewForm.utility_type ?? ""}
            onChange={(e) =>
              setReviewForm((prev) => ({ ...prev, utility_type: e.target.value }))
            }
            fullWidth
          />
          <TextField
            label="Account Number"
            value={reviewForm.account_number ?? ""}
            onChange={(e) =>
              setReviewForm((prev) => ({ ...prev, account_number: e.target.value }))
            }
            fullWidth
          />
          <TextField
            label="Total Amount Due"
            type="number"
            value={reviewForm.total_amount_due ?? ""}
            onChange={(e) =>
              setReviewForm((prev) => ({
                ...prev,
                total_amount_due:
                  e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
            fullWidth
          />
          <TextField
            label="Usage Amount"
            type="number"
            value={reviewForm.usage_amount ?? ""}
            onChange={(e) =>
              setReviewForm((prev) => ({
                ...prev,
                usage_amount: e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveReview} disabled={reviewSubmitting} variant="contained">
            Save Review
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
