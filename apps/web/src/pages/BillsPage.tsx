import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import SearchIcon from "@mui/icons-material/Search";

import { loadBills, setBillsSearchForm } from "../store/actions/billsActions";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { DEFAULT_BILLS_SEARCH_FORM } from "../store/reducers/billsReducer";
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
    searchForm.searchQuery,
    searchForm.utilityFilter,
    searchForm.reviewStatusFilter,
    searchForm.startDate,
    searchForm.endDate,
  ]);

  const rows = result?.items ?? [];

  const handleSortChange = (field: BillsSortBy) => {
    if (searchForm.sortBy === field) {
      dispatch(
        setBillsSearchForm({
          sortOrder: searchForm.sortOrder === "asc" ? "desc" : "asc",
          page: 0,
        }),
      );
    } else {
      dispatch(
        setBillsSearchForm({ sortBy: field, sortOrder: "desc", page: 0 }),
      );
    }
  };

  // Count active filters (excluding defaults)
  const activeFilterCount = [
    searchForm.utilityFilter !== DEFAULT_BILLS_SEARCH_FORM.utilityFilter,
    searchForm.reviewStatusFilter !==
      DEFAULT_BILLS_SEARCH_FORM.reviewStatusFilter,
    searchForm.startDate !== DEFAULT_BILLS_SEARCH_FORM.startDate,
    searchForm.endDate !== DEFAULT_BILLS_SEARCH_FORM.endDate,
  ].filter(Boolean).length;

  // Count active non-default sorts
  const activeSortCount = [
    searchForm.sortBy !== DEFAULT_BILLS_SEARCH_FORM.sortBy,
    searchForm.sortOrder !== DEFAULT_BILLS_SEARCH_FORM.sortOrder,
  ].filter(Boolean).length;

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
          gap: 2,
        }}
      >
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: "#1A2533", flexShrink: 0 }}
        >
          Bills
        </Typography>

        {/* Search bar */}
        <TextField
          size="small"
          placeholder="Search by bill ID or provider…"
          value={searchForm.searchQuery ?? ""}
          onChange={(e) =>
            dispatch(
              setBillsSearchForm({ searchQuery: e.target.value, page: 0 }),
            )
          }
          sx={{ flex: 1, maxWidth: 380 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#9AB0C0", fontSize: "1.1rem" }} />
              </InputAdornment>
            ),
          }}
        />

        <Box
          sx={{ display: "flex", gap: 1, alignItems: "center", flexShrink: 0 }}
        >
          {error ? (
            <Alert severity="error" sx={{ py: 0 }}>
              {error}
            </Alert>
          ) : null}

          {/* Filters button with badge */}
          <Tooltip
            title={
              activeFilterCount > 0
                ? `${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""} active`
                : "Filter bills"
            }
          >
            <Badge
              badgeContent={activeFilterCount || null}
              color="primary"
              overlap="circular"
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: "0.65rem",
                  height: 16,
                  minWidth: 16,
                },
              }}
            >
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={(e) => setFiltersAnchorEl(e.currentTarget)}
                sx={{
                  borderColor: activeFilterCount > 0 ? "#1B4F72" : "#C8D8E8",
                  color: activeFilterCount > 0 ? "#1B4F72" : "#4A6072",
                  fontWeight: activeFilterCount > 0 ? 700 : 500,
                }}
              >
                Filters
              </Button>
            </Badge>
          </Tooltip>

          {/* Sort button with badge */}
          <Tooltip
            title={
              activeSortCount > 0
                ? `${activeSortCount} sort${activeSortCount !== 1 ? "s" : ""} active`
                : "Sort bills"
            }
          >
            <Badge
              badgeContent={activeSortCount || null}
              color="primary"
              overlap="circular"
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: "0.65rem",
                  height: 16,
                  minWidth: 16,
                },
              }}
            >
              <Button
                variant="outlined"
                size="small"
                startIcon={<SortIcon />}
                onClick={(e) => setSortAnchorEl(e.currentTarget)}
                sx={{
                  borderColor: activeSortCount > 0 ? "#1B4F72" : "#C8D8E8",
                  color: activeSortCount > 0 ? "#1B4F72" : "#4A6072",
                  fontWeight: activeSortCount > 0 ? 700 : 500,
                }}
              >
                Sort
              </Button>
            </Badge>
          </Tooltip>
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
            width: 360,
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

          <FormControl fullWidth size="small">
            <InputLabel>Utility Type</InputLabel>
            <Select
              value={searchForm.utilityFilter}
              label="Utility Type"
              onChange={(e) =>
                dispatch(
                  setBillsSearchForm({
                    page: 0,
                    utilityFilter: e.target.value,
                  }),
                )
              }
            >
              <MenuItem value="">All utilities</MenuItem>
              <MenuItem value="electric">Electric</MenuItem>
              <MenuItem value="water">Water</MenuItem>
              <MenuItem value="gas">Gas</MenuItem>
              <MenuItem value="internet">Internet</MenuItem>
              <MenuItem value="waste">Waste</MenuItem>
            </Select>
          </FormControl>

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
              <MenuItem value="">All statuses</MenuItem>
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

      {/* Table + pagination */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <BillsGrid
          bills={rows}
          loading={loading}
          stickyHeader
          sortBy={searchForm.sortBy}
          sortOrder={searchForm.sortOrder}
          onSortChange={handleSortChange}
        />
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
