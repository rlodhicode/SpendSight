import { useEffect, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import { api } from "../api";
import type { BillRecord, BillsSortBy, BillsSortOrder, PaginatedBillsResponse } from "../types";

type BillsPageProps = {
  token: string;
};

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50];

export function BillsPage({ token }: BillsPageProps) {
  const navigate = useNavigate();
  const [result, setResult] = useState<PaginatedBillsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<BillsSortBy>("billing_period_end");
  const [sortOrder, setSortOrder] = useState<BillsSortOrder>("desc");
  const [providerFilter, setProviderFilter] = useState("");
  const [utilityFilter, setUtilityFilter] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getBills(token, {
          page: page + 1,
          page_size: pageSize,
          sort_by: sortBy,
          sort_order: sortOrder,
          provider: providerFilter || undefined,
          utility_type: utilityFilter || undefined,
          review_status: reviewStatusFilter || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        });
        setResult(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token, page, pageSize, sortBy, sortOrder, providerFilter, utilityFilter, reviewStatusFilter, startDate, endDate]);

  const handleSort = (field: BillsSortBy) => {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortOrder("asc");
  };

  const rows: BillRecord[] = result?.items ?? [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h4">Bills</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card elevation={0}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Provider contains"
                value={providerFilter}
                onChange={(event) => {
                  setPage(0);
                  setProviderFilter(event.target.value);
                }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Utility type"
                value={utilityFilter}
                onChange={(event) => {
                  setPage(0);
                  setUtilityFilter(event.target.value);
                }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel id="review-status-filter-label">Review Status</InputLabel>
                <Select
                  labelId="review-status-filter-label"
                  value={reviewStatusFilter}
                  label="Review Status"
                  onChange={(event) => {
                    setPage(0);
                    setReviewStatusFilter(event.target.value);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="needs_review">Needs Review</MenuItem>
                  <MenuItem value="reviewed">Reviewed</MenuItem>
                  <MenuItem value="not_required">Not Required</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Period End From"
                type="date"
                value={startDate}
                onChange={(event) => {
                  setPage(0);
                  setStartDate(event.target.value);
                }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Period End To"
                type="date"
                value={endDate}
                onChange={(event) => {
                  setPage(0);
                  setEndDate(event.target.value);
                }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card elevation={0}>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={sortBy === "provider_name" ? sortOrder : false}>
                    <TableSortLabel
                      active={sortBy === "provider_name"}
                      direction={sortBy === "provider_name" ? sortOrder : "asc"}
                      onClick={() => handleSort("provider_name")}
                    >
                      Provider
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Utility</TableCell>
                  <TableCell sortDirection={sortBy === "billing_period_end" ? sortOrder : false}>
                    <TableSortLabel
                      active={sortBy === "billing_period_end"}
                      direction={sortBy === "billing_period_end" ? sortOrder : "asc"}
                      onClick={() => handleSort("billing_period_end")}
                    >
                      Period End
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortBy === "total_amount_due" ? sortOrder : false} align="right">
                    <TableSortLabel
                      active={sortBy === "total_amount_due"}
                      direction={sortBy === "total_amount_due" ? sortOrder : "asc"}
                      onClick={() => handleSort("total_amount_due")}
                    >
                      Amount Due
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Review Status</TableCell>
                  <TableCell sortDirection={sortBy === "extracted_at" ? sortOrder : false}>
                    <TableSortLabel
                      active={sortBy === "extracted_at"}
                      direction={sortBy === "extracted_at" ? sortOrder : "asc"}
                      onClick={() => handleSort("extracted_at")}
                    >
                      Extracted
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => navigate(`/bills/${row.id}`)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>{row.provider_name}</TableCell>
                    <TableCell>{row.utility_type}</TableCell>
                    <TableCell>{new Date(row.billing_period_end).toLocaleDateString()}</TableCell>
                    <TableCell align="right">${row.total_amount_due.toFixed(2)}</TableCell>
                    <TableCell>{row.review_status ?? "not_required"}</TableCell>
                    <TableCell>{new Date(row.extracted_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {!loading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2">No bills found for this filter set.</Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={result?.total ?? 0}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(event) => {
              setPage(0);
              setPageSize(Number(event.target.value));
            }}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
