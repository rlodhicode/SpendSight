import { useEffect, useState } from "react";
import { Alert, Box, Button, Grid } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ReceiptIcon from "@mui/icons-material/Receipt";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

import { api } from "../api";
import { BillsGrid } from "../components/BillsGrid";
import { ProviderList } from "../components/ProviderList";
import { ReviewQueueCard } from "../components/ReviewQueueCard";
import { SpendChart } from "../components/Chart";
import { StatCard } from "../components/StatCard";
import { UploadCard } from "../components/UploadCard";
import { trackJob } from "../store/actions/jobsActions";
import { useAppDispatch } from "../store/hooks";
import type {
  AnalyticsSummary,
  BillRecord,
  JobStatus,
  ReviewQueueItem,
} from "../types";

type DashboardPageProps = {
  token: string;
};

export function DashboardPage({ token }: DashboardPageProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewQueueItem[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    void loadData(token);
  }, [token]);

  function loadData(activeToken: string) {
    setDataLoading(true);
    setReviewLoading(true);
    return Promise.all([
      api.getSummary(activeToken, { months: 12, include_needs_review: true }),
      api.getBills(activeToken, {
        page: 1,
        page_size: 8,
        sort_by: "billing_period_end",
        sort_order: "desc",
      }),
      api.getReviewQueue(activeToken, 1, 5),
    ])
      .then(([summaryResult, billsResult, reviewQueue]) => {
        setSummary(summaryResult);
        setBills(billsResult.items);
        setReviewItems(reviewQueue.items);
        setReviewTotal(reviewQueue.total);
      })
      .catch((loadError: Error) => {
        setError(loadError.message);
      })
      .finally(() => {
        setDataLoading(false);
        setReviewLoading(false);
      });
  }

  function handleUpload(utilityType: string, file: File) {
    setUploading(true);
    setError(null);
    return api
      .uploadBill(token, utilityType, file)
      .then((upload) => {
        dispatch(
          trackJob({
            job_id: upload.job_id,
            status: upload.status as JobStatus["status"],
          }),
        );
      })
      .catch((uploadError: Error) => {
        setError(uploadError.message);
      })
      .finally(() => {
        setUploading(false);
      });
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        pb: "48px",
      }}
    >
      {error ? <Alert severity="error">{error}</Alert> : null}

      {/* Stat cards */}
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
            subtitle="Last 12 months"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Bills Processed"
            value={summary?.bills_count ?? 0}
            icon={<ReceiptIcon />}
            color="success"
            loading={dataLoading}
            subtitle="Last 12 months"
          />
        </Grid>
      </Grid>

      {/* Upload + Provider / Review queue */}
      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} md={6}>
          <UploadCard
            onUpload={handleUpload}
            uploading={uploading}
            error={error}
          />
        </Grid>
        <Grid
          item
          xs={12}
          md={6}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <ProviderList
            providers={summary?.totals_by_provider ?? []}
            totalSpend={summary?.total_spend ?? 0}
            loading={dataLoading}
          />
          <ReviewQueueCard
            items={reviewItems}
            total={reviewTotal}
            loading={reviewLoading}
            onOpenReview={(billPublicId) => navigate(`/bills/${billPublicId}`)}
          />
        </Grid>
      </Grid>

      {/* Monthly spend chart */}
      <SpendChart
        monthlyTotals={summary?.totals_by_month ?? []}
        loading={dataLoading}
      />

      {/* Recent bills — card mode with icon header, same grid, View All top-right */}
      <BillsGrid
        bills={bills}
        loading={dataLoading}
        asCard
        headerAction={
          <Button
            component={RouterLink}
            to="/bills"
            variant="outlined"
            size="small"
            sx={{ borderColor: "#C8D8E8", color: "#4A6072" }}
          >
            View All
          </Button>
        }
      />
    </Box>
  );
}
