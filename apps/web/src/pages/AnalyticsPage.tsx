import { useEffect } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ReceiptIcon from "@mui/icons-material/Receipt";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import IconButton from "@mui/material/IconButton";
import {
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  loadAnalytics,
  resetAnalyticsFilters,
  setAnalyticsFilters,
} from "../store/actions/analyticsActions";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { StatCard } from "../components/StatCard";

type AnalyticsPageProps = {
  token: string;
};

const PIE_COLORS = [
  "#1B4F72",
  "#17A589",
  "#D68910",
  "#2E86C1",
  "#6C7A89",
  "#8E44AD",
];

// Unique ID constants for InputLabel htmlFor — avoids MUI label/input association issues
const PROVIDER_LABEL_ID = "analytics-provider-label";
const UTILITY_LABEL_ID = "analytics-utility-label";

export function AnalyticsPage({ token }: AnalyticsPageProps) {
  const dispatch = useAppDispatch();
  const { filters, summary, allProviders, allUtilityTypes, loading, error } =
    useAppSelector((state) => state.analyticsState);

  useEffect(() => {
    void dispatch(loadAnalytics(token));
  }, [
    dispatch,
    token,
    filters.startDate,
    filters.endDate,
    filters.providers,
    filters.utilityTypes,
    filters.includeNeedsReview,
  ]);

  const hasActiveFilters =
    !!filters.startDate ||
    !!filters.endDate ||
    filters.providers.length > 0 ||
    filters.utilityTypes.length > 0 ||
    !filters.includeNeedsReview;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pb: "48px" }}>
      {/* Page header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h4">Analytics</Typography>
        {hasActiveFilters && (
          <Chip
            label="Filters active"
            color="primary"
            size="small"
            onDelete={() => dispatch(resetAnalyticsFilters())}
            deleteIcon={<RestartAltIcon />}
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {/* Filter bar */}
      <Card elevation={0}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <FilterListIcon sx={{ color: "#4A6072", fontSize: "1.1rem" }} />
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, color: "#1A2533" }}
            >
              Filters
            </Typography>
          </Box>

          <Grid container spacing={2} alignItems="center">
            {/* Date range */}
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="From"
                type="date"
                size="small"
                fullWidth
                value={filters.startDate}
                onChange={(e) =>
                  dispatch(setAnalyticsFilters({ startDate: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="To"
                type="date"
                size="small"
                fullWidth
                value={filters.endDate}
                onChange={(e) =>
                  dispatch(setAnalyticsFilters({ endDate: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Provider multi-select
                Key fix: use shrink=true + notched on the InputLabel so the label
                always sits in the top-left corner, preventing overlap with the
                placeholder rendered via renderValue when the array is empty. */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel
                  id={PROVIDER_LABEL_ID}
                  shrink
                  sx={{ background: "#fff", px: 0.5 }}
                >
                  Provider
                </InputLabel>
                <Select
                  labelId={PROVIDER_LABEL_ID}
                  multiple
                  displayEmpty
                  value={filters.providers}
                  input={<OutlinedInput notched label="Provider" />}
                  onChange={(e) =>
                    dispatch(
                      setAnalyticsFilters({
                        providers:
                          typeof e.target.value === "string"
                            ? [e.target.value]
                            : e.target.value,
                      }),
                    )
                  }
                  renderValue={(selected) =>
                    selected.length === 0 ? (
                      <Typography variant="body2" sx={{ color: "#9AB0C0" }}>
                        All providers
                      </Typography>
                    ) : selected.length === 1 ? (
                      selected[0]
                    ) : (
                      `${selected.length} selected`
                    )
                  }
                >
                  {allProviders.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="caption" sx={{ color: "#9AB0C0" }}>
                        No providers yet
                      </Typography>
                    </MenuItem>
                  ) : (
                    allProviders.map((p) => (
                      <MenuItem key={p} value={p}>
                        <Checkbox
                          checked={filters.providers.includes(p)}
                          size="small"
                          sx={{ p: 0.5 }}
                        />
                        {p}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>

            {/* Utility type multi-select — same label fix */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel
                  id={UTILITY_LABEL_ID}
                  shrink
                  sx={{ background: "#fff", px: 0.5 }}
                >
                  Utility
                </InputLabel>
                <Select
                  labelId={UTILITY_LABEL_ID}
                  multiple
                  displayEmpty
                  value={filters.utilityTypes}
                  input={<OutlinedInput notched label="Utility" />}
                  onChange={(e) =>
                    dispatch(
                      setAnalyticsFilters({
                        utilityTypes:
                          typeof e.target.value === "string"
                            ? [e.target.value]
                            : e.target.value,
                      }),
                    )
                  }
                  renderValue={(selected) =>
                    selected.length === 0 ? (
                      <Typography variant="body2" sx={{ color: "#9AB0C0" }}>
                        All utilities
                      </Typography>
                    ) : selected.length === 1 ? (
                      selected[0]
                    ) : (
                      `${selected.length} selected`
                    )
                  }
                >
                  {allUtilityTypes.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="caption" sx={{ color: "#9AB0C0" }}>
                        No utilities yet
                      </Typography>
                    </MenuItem>
                  ) : (
                    allUtilityTypes.map((u) => (
                      <MenuItem key={u} value={u}>
                        <Checkbox
                          checked={filters.utilityTypes.includes(u)}
                          size="small"
                          sx={{ p: 0.5 }}
                        />
                        {u}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>

            {/* Include needs review */}
            <Grid item xs={12} md={2}>
              <Tooltip title="When off, bills flagged for review are excluded from totals">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filters.includeNeedsReview}
                      onChange={(e) =>
                        dispatch(
                          setAnalyticsFilters({
                            includeNeedsReview: e.target.checked,
                          }),
                        )
                      }
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>
                      Include unreviewed
                    </Typography>
                  }
                />
              </Tooltip>
            </Grid>

            {/* Reset */}
            {hasActiveFilters && (
              <Grid item xs="auto">
                <Tooltip title="Reset all filters">
                  <IconButton
                    size="small"
                    onClick={() => dispatch(resetAnalyticsFilters())}
                    sx={{ color: "#9AB0C0", "&:hover": { color: "#C0392B" } }}
                  >
                    <RestartAltIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Summary stat chips */}
      {summary && !loading && (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {/* Stat cards */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <StatCard
                      title="Total Spend"
                      value={`$${summary?.total_spend.toLocaleString("en-US", { minimumFractionDigits: 2 }) ?? "0.00"}`}
                      icon={<AttachMoneyIcon />}
                      color="primary"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <StatCard
                      title="Average Bill"
                      value={`$${summary?.average_bill.toFixed(2) ?? "0.00"}`}
                      icon={<TrendingUpIcon />}
                      color="secondary"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <StatCard
                      title="Bills Processed"
                      value={summary?.bills_count ?? 0}
                      icon={<ReceiptIcon />}
                      color="success"
                    />
                  </Grid>
                </Grid>
        </Box>
      )}

      {loading && (
        <Typography variant="body2" sx={{ color: "#9AB0C0" }}>
          Loading analytics…
        </Typography>
      )}

      {/* Charts */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card elevation={0}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Spend by Provider
              </Typography>
              <Box sx={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={summary?.totals_by_provider ?? []}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label
                    >
                      {(summary?.totals_by_provider ?? []).map(
                        (entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ),
                      )}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={0}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Spend by Utility
              </Typography>
              <Box sx={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={summary?.totals_by_utility ?? []}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label
                    >
                      {(summary?.totals_by_utility ?? []).map(
                        (entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ),
                      )}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={0}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Monthly Spend Trend
          </Typography>
          <Box sx={{ width: "100%", height: 340 }}>
            <ResponsiveContainer>
              <LineChart data={summary?.totals_by_month ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#1B4F72"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
