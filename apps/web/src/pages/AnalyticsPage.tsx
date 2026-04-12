import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "../api";
import type { AnalyticsSummary } from "../types";

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

export function AnalyticsPage({ token }: AnalyticsPageProps) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState<number>(12);
  const [providerFilter, setProviderFilter] = useState("");
  const [utilityFilter, setUtilityFilter] = useState("");
  const [includeNeedsReview, setIncludeNeedsReview] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getSummary(token, {
          months,
          include_needs_review: includeNeedsReview,
          provider: providerFilter ? [providerFilter] : undefined,
          utility_type: utilityFilter ? [utilityFilter] : undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        });
        setSummary(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [
    token,
    months,
    includeNeedsReview,
    providerFilter,
    utilityFilter,
    startDate,
    endDate,
  ]);

  const providerOptions = useMemo(
    () => (summary?.totals_by_provider ?? []).map((item) => item.name),
    [summary],
  );
  const utilityOptions = useMemo(
    () => (summary?.totals_by_utility ?? []).map((item) => item.name),
    [summary],
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pb: "48px" }}>
      <Typography variant="h4">Analytics</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card elevation={0}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth>
                <InputLabel id="months-label">Months</InputLabel>
                <Select
                  labelId="months-label"
                  value={months}
                  label="Months"
                  onChange={(event) => setMonths(Number(event.target.value))}
                >
                  <MenuItem value={3}>3</MenuItem>
                  <MenuItem value={6}>6</MenuItem>
                  <MenuItem value={12}>12</MenuItem>
                  <MenuItem value={24}>24</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth>
                <InputLabel id="provider-filter-label">Provider</InputLabel>
                <Select
                  labelId="provider-filter-label"
                  value={providerFilter}
                  label="Provider"
                  onChange={(event) => setProviderFilter(event.target.value)}
                >
                  <MenuItem value="">All Providers</MenuItem>
                  {providerOptions.map((provider) => (
                    <MenuItem key={provider} value={provider}>
                      {provider}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth>
                <InputLabel id="utility-filter-label">Utility</InputLabel>
                <Select
                  labelId="utility-filter-label"
                  value={utilityFilter}
                  label="Utility"
                  onChange={(event) => setUtilityFilter(event.target.value)}
                >
                  <MenuItem value="">All Utilities</MenuItem>
                  {utilityOptions.map((utility) => (
                    <MenuItem key={utility} value={utility}>
                      {utility}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Switch
                  checked={includeNeedsReview}
                  onChange={(event) =>
                    setIncludeNeedsReview(event.target.checked)
                  }
                />
                <Typography variant="body2">
                  Include bills that still need review
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

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
                    <Tooltip />
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
                    <Tooltip />
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
                <Tooltip />
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

      {loading ? (
        <Typography variant="body2">Loading analytics...</Typography>
      ) : null}
    </Box>
  );
}
