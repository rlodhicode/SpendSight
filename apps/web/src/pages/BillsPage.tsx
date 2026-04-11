import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import { useNavigate } from "react-router-dom";

import { loadBills, setBillsSearchForm } from "../store/actions/billsActions";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { BillsSortBy, BillsSortOrder } from "../types";

type BillsPageProps = {
  token: string;
};

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50];

export function BillsPage({ token }: BillsPageProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { result, loading, error, searchForm } = useAppSelector((state) => state.billsState);
  const [filtersAnchorEl, setFiltersAnchorEl] = useState<HTMLElement | null>(null);
  const [sortAnchorEl, setSortAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    void dispatch(loadBills(token));
  }, [
    dispatch,
    token,
    searchForm.page,
    searchForm.pageSize,
    searchForm.sortBy,
    searchForm.sortOrder,
    searchForm.providerFilter,
    searchForm.utilityFilter,
    searchForm.reviewStatusFilter,
    searchForm.startDate,
    searchForm.endDate,
  ]);

  const rows = result?.items ?? [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h4">Bills</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card elevation={0}>
        <CardContent sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary">
            Use filters and sort options to refine your bill grid.
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={(event) => setFiltersAnchorEl(event.currentTarget)}
            >
              Filters
            </Button>
            <Button
              variant="outlined"
              startIcon={<SortIcon />}
              onClick={(event) => setSortAnchorEl(event.currentTarget)}
            >
              Sort
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Popover
        open={Boolean(filtersAnchorEl)}
        anchorEl={filtersAnchorEl}
        onClose={() => setFiltersAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Box sx={{ p: 2, width: 420 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Provider contains"
                value={searchForm.providerFilter}
                onChange={(event) =>
                  dispatch(setBillsSearchForm({ page: 0, providerFilter: event.target.value }))
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Utility type"
                value={searchForm.utilityFilter}
                onChange={(event) =>
                  dispatch(setBillsSearchForm({ page: 0, utilityFilter: event.target.value }))
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="review-status-filter-label">Review Status</InputLabel>
                <Select
                  labelId="review-status-filter-label"
                  value={searchForm.reviewStatusFilter}
                  label="Review Status"
                  onChange={(event) =>
                    dispatch(setBillsSearchForm({ page: 0, reviewStatusFilter: event.target.value }))
                  }
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
                value={searchForm.startDate}
                onChange={(event) =>
                  dispatch(setBillsSearchForm({ page: 0, startDate: event.target.value }))
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Period End To"
                type="date"
                value={searchForm.endDate}
                onChange={(event) =>
                  dispatch(setBillsSearchForm({ page: 0, endDate: event.target.value }))
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>
      </Popover>

      <Popover
        open={Boolean(sortAnchorEl)}
        anchorEl={sortAnchorEl}
        onClose={() => setSortAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Box sx={{ p: 2, width: 320, display: "flex", flexDirection: "column", gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="sort-field-label">Sort Field</InputLabel>
            <Select
              labelId="sort-field-label"
              value={searchForm.sortBy}
              label="Sort Field"
              onChange={(event) =>
                dispatch(setBillsSearchForm({ page: 0, sortBy: event.target.value as BillsSortBy }))
              }
            >
              <MenuItem value="billing_period_end">Period End</MenuItem>
              <MenuItem value="provider_name">Provider</MenuItem>
              <MenuItem value="total_amount_due">Amount Due</MenuItem>
              <MenuItem value="extracted_at">Extracted</MenuItem>
              <MenuItem value="overall_confidence">Confidence</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="sort-direction-label">Direction</InputLabel>
            <Select
              labelId="sort-direction-label"
              value={searchForm.sortOrder}
              label="Direction"
              onChange={(event) =>
                dispatch(setBillsSearchForm({ page: 0, sortOrder: event.target.value as BillsSortOrder }))
              }
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Popover>

      <Card elevation={0}>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Bill ID</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Utility</TableCell>
                  <TableCell>Period End</TableCell>
                  <TableCell align="right">Amount Due</TableCell>
                  <TableCell align="right">Confidence</TableCell>
                  <TableCell>Review Status</TableCell>
                  <TableCell>Extracted</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => navigate(`/bills/${row.public_id}`)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>{row.public_id}</TableCell>
                    <TableCell>{row.provider_name}</TableCell>
                    <TableCell>{row.utility_type}</TableCell>
                    <TableCell>{new Date(row.billing_period_end).toLocaleDateString()}</TableCell>
                    <TableCell align="right">${row.total_amount_due.toFixed(2)}</TableCell>
                    <TableCell align="right">{Math.round((row.overall_confidence ?? row.confidence_score) * 100)}%</TableCell>
                    <TableCell>{row.review_status ?? "not_required"}</TableCell>
                    <TableCell>{new Date(row.extracted_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {!loading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
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
            page={searchForm.page}
            onPageChange={(_, newPage) => dispatch(setBillsSearchForm({ page: newPage }))}
            rowsPerPage={searchForm.pageSize}
            onRowsPerPageChange={(event) => {
              dispatch(setBillsSearchForm({ page: 0, pageSize: Number(event.target.value) }));
            }}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
