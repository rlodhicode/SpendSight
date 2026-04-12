import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  TablePagination,
  TextField,
  Typography,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";

import { loadBills, setBillsSearchForm } from "../store/actions/billsActions";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { BillsSortBy, BillsSortOrder } from "../types";
import { BillsGrid } from "../components/BillsGrid";
import { ROWS_PER_PAGE_OPTIONS } from "../constants/billConstants";

type BillsPageProps = {
  token: string;
};

export function BillsPage({ token }: BillsPageProps) {
  const dispatch = useAppDispatch();
  const { result, loading, error, searchForm } = useAppSelector(
    (state) => state.billsState,
  );
  const [filtersAnchorEl, setFiltersAnchorEl] = useState<HTMLElement | null>(
    null,
  );
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
      }}
    >
      {/* Page header bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 2,
          borderBottom: "1px solid #D5E3EE",
          flexShrink: 0,
          background: "#fff",
        }}
      >
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: "#1A2533", pr: 5 }}
        >
          Bills
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {error ? (
            <Alert severity="error" sx={{ py: 0 }}>
              {error}
            </Alert>
          ) : null}
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterListIcon />}
            onClick={(e) => setFiltersAnchorEl(e.currentTarget)}
            sx={{ borderColor: "#C8D8E8", color: "#4A6072" }}
          >
            Filters
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SortIcon />}
            onClick={(e) => setSortAnchorEl(e.currentTarget)}
            sx={{ borderColor: "#C8D8E8", color: "#4A6072" }}
          >
            Sort
          </Button>
        </Box>
      </Box>

      {/* Filters popover */}
      <Popover
        open={Boolean(filtersAnchorEl)}
        anchorEl={filtersAnchorEl}
        onClose={() => setFiltersAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box
          sx={{
            p: 2.5,
            width: 400,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, color: "#1A2533" }}
          >
            Filter Bills
          </Typography>
          <Box
            sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}
          >
            <TextField
              label="Provider"
              size="small"
              value={searchForm.providerFilter}
              onChange={(e) =>
                dispatch(
                  setBillsSearchForm({
                    page: 0,
                    providerFilter: e.target.value,
                  }),
                )
              }
              fullWidth
            />
            <TextField
              label="Utility type"
              size="small"
              value={searchForm.utilityFilter}
              onChange={(e) =>
                dispatch(
                  setBillsSearchForm({
                    page: 0,
                    utilityFilter: e.target.value,
                  }),
                )
              }
              fullWidth
            />
          </Box>
          <FormControl fullWidth size="small">
            <InputLabel>Review Status</InputLabel>
            <Select
              value={searchForm.reviewStatusFilter}
              label="Review Status"
              onChange={(e) =>
                dispatch(
                  setBillsSearchForm({
                    page: 0,
                    reviewStatusFilter: e.target.value,
                  }),
                )
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="needs_review">Needs Review</MenuItem>
              <MenuItem value="reviewed">Reviewed</MenuItem>
              <MenuItem value="not_required">OK / Not Required</MenuItem>
            </Select>
          </FormControl>
          <Box
            sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}
          >
            <TextField
              label="Period End From"
              type="date"
              size="small"
              value={searchForm.startDate}
              onChange={(e) =>
                dispatch(
                  setBillsSearchForm({ page: 0, startDate: e.target.value }),
                )
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Period End To"
              type="date"
              size="small"
              value={searchForm.endDate}
              onChange={(e) =>
                dispatch(
                  setBillsSearchForm({ page: 0, endDate: e.target.value }),
                )
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </Box>
      </Popover>

      {/* Sort popover */}
      <Popover
        open={Boolean(sortAnchorEl)}
        anchorEl={sortAnchorEl}
        onClose={() => setSortAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box
          sx={{
            p: 2.5,
            width: 280,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, color: "#1A2533" }}
          >
            Sort
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Field</InputLabel>
            <Select
              value={searchForm.sortBy}
              label="Field"
              onChange={(e) =>
                dispatch(
                  setBillsSearchForm({
                    page: 0,
                    sortBy: e.target.value as BillsSortBy,
                  }),
                )
              }
            >
              <MenuItem value="billing_period_end">Period End</MenuItem>
              <MenuItem value="provider_name">Provider</MenuItem>
              <MenuItem value="total_amount_due">Amount Due</MenuItem>
              <MenuItem value="extracted_at">Extracted</MenuItem>
              <MenuItem value="overall_confidence">Confidence</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Direction</InputLabel>
            <Select
              value={searchForm.sortOrder}
              label="Direction"
              onChange={(e) =>
                dispatch(
                  setBillsSearchForm({
                    page: 0,
                    sortOrder: e.target.value as BillsSortOrder,
                  }),
                )
              }
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Popover>

      {/* Table fills remaining height */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <BillsGrid bills={rows} loading={loading} stickyHeader />

        {/* Pagination pinned to bottom */}
        <Box
          sx={{
            borderTop: "1px solid #D5E3EE",
            flexShrink: 0,
            background: "#fff",
          }}
        >
          <TablePagination
            component="div"
            count={result?.total ?? 0}
            page={searchForm.page}
            onPageChange={(_, newPage) =>
              dispatch(setBillsSearchForm({ page: newPage }))
            }
            rowsPerPage={searchForm.pageSize}
            onRowsPerPageChange={(e) =>
              dispatch(
                setBillsSearchForm({
                  page: 0,
                  pageSize: Number(e.target.value),
                }),
              )
            }
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          />
        </Box>
      </Box>
    </Box>
  );
}
