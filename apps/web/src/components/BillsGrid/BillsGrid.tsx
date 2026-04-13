import React from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { useNavigate } from "react-router-dom";

import type { BillRecord, BillsSortBy, BillsSortOrder } from "../../types";
import {
  UTILITY_COLORS,
  UTILITY_LABELS,
  REVIEW_STATUS_CONFIG,
  getConfidenceColor,
} from "../../constants/billConstants";

interface BillsGridProps {
  bills: BillRecord[];
  loading?: boolean;
  asCard?: boolean;
  headerAction?: React.ReactNode;
  stickyHeader?: boolean;
  /** Active sort field — only used in non-card (full page) mode */
  sortBy?: BillsSortBy;
  /** Active sort direction */
  sortOrder?: BillsSortOrder;
  /** Called when a sortable column header is clicked */
  onSortChange?: (field: BillsSortBy) => void;
}

const SKELETON_ROWS = 4;
const SKELETON_COLS = 7;

function UtilityChip({ utilityType }: { utilityType: string }) {
  const key = utilityType?.toLowerCase() ?? "";
  return (
    <Chip
      label={UTILITY_LABELS[key] ?? utilityType}
      size="small"
      color={UTILITY_COLORS[key] ?? "default"}
      variant="outlined"
      sx={{ fontSize: "0.7rem", height: 22, fontWeight: 600 }}
    />
  );
}

function ReviewStatusChip({ status }: { status: string }) {
  const cfg = REVIEW_STATUS_CONFIG[status] ?? {
    label: status,
    color: "default" as const,
  };
  return (
    <Chip
      label={cfg.label}
      size="small"
      color={cfg.color}
      variant={cfg.color === "success" ? "outlined" : "filled"}
      sx={{ fontSize: "0.7rem", height: 22, fontWeight: 600 }}
    />
  );
}

type SortableColumn = {
  id: BillsSortBy;
  label: string;
  align?: "left" | "right";
};

const SORTABLE_COLUMNS: SortableColumn[] = [
  { id: "billing_period_end", label: "Period End" },
  { id: "total_amount_due", label: "Amount Due", align: "right" },
  { id: "overall_confidence", label: "Confidence", align: "right" },
  { id: "extracted_at", label: "Extracted" },
];

const SORTABLE_IDS = new Set<string>(SORTABLE_COLUMNS.map((c) => c.id));

function BillTableContent({
  bills,
  loading,
  stickyHeader,
  sortBy,
  sortOrder,
  onSortChange,
}: {
  bills: BillRecord[];
  loading: boolean;
  stickyHeader: boolean;
  sortBy?: BillsSortBy;
  sortOrder?: BillsSortOrder;
  onSortChange?: (field: BillsSortBy) => void;
}) {
  const navigate = useNavigate();

  const renderHeaderCell = (
    label: string,
    fieldId?: BillsSortBy,
    align: "left" | "right" = "left",
  ) => {
    if (!fieldId || !onSortChange || !SORTABLE_IDS.has(fieldId)) {
      return (
        <TableCell align={align} key={label}>
          {label}
        </TableCell>
      );
    }
    const isActive = sortBy === fieldId;
    return (
      <TableCell
        key={fieldId}
        align={align}
        sortDirection={isActive ? sortOrder : false}
      >
        <TableSortLabel
          active={isActive}
          direction={isActive ? sortOrder : "desc"}
          onClick={() => onSortChange(fieldId)}
          sx={{
            "& .MuiTableSortLabel-icon": { opacity: isActive ? 1 : 0.3 },
            "&:hover .MuiTableSortLabel-icon": { opacity: 0.7 },
          }}
        >
          {label}
        </TableSortLabel>
      </TableCell>
    );
  };

  return (
    <TableContainer sx={{ flex: 1, overflow: "auto" }}>
      <Table size="small" stickyHeader={stickyHeader}>
        <TableHead>
          <TableRow>
            <TableCell>Bill ID</TableCell>
            <TableCell>Provider</TableCell>
            <TableCell>Utility</TableCell>
            {renderHeaderCell("Period End", "billing_period_end")}
            {renderHeaderCell("Amount Due", "total_amount_due", "right")}
            {renderHeaderCell("Confidence", "overall_confidence", "right")}
            <TableCell>Review Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading
            ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: SKELETON_COLS }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton variant="text" width="80%" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : bills.map((row) => {
                const reviewStatus = row.review_status ?? "not_required";
                const rawConfidence =
                  (row.overall_confidence ?? row.confidence_score) || 0;
                const confidence = Math.round(rawConfidence * 100);
                const confidenceColor = getConfidenceColor(rawConfidence);

                return (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => navigate(`/bills/${row.public_id}`)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: "#1A2533",
                          fontFamily: "monospace",
                          fontSize: "0.8rem",
                        }}
                      >
                        {row.public_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {row.provider_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <UtilityChip utilityType={row.utility_type} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: "#4A6072" }}>
                        {new Date(row.billing_period_end).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        ${row.total_amount_due.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: confidenceColor,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {confidence}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <ReviewStatusChip status={reviewStatus} />
                    </TableCell>
                  </TableRow>
                );
              })}

          {!loading && bills.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={SKELETON_COLS}
                align="center"
                sx={{ py: 6, color: "#9AB0C0" }}
              >
                No bills yet. Upload your first utility bill to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function BillsGrid({
  bills,
  loading = false,
  asCard = false,
  headerAction,
  stickyHeader = false,
  sortBy,
  sortOrder,
  onSortChange,
}: BillsGridProps) {
  if (asCard) {
    return (
      <Card
        elevation={0}
        sx={{ border: "1px solid #D5E3EE", borderRadius: 3 }}
        data-testid="bills-grid-card"
      >
        <CardContent sx={{ p: "28px !important" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <ReceiptLongIcon sx={{ color: "#1B4F72", fontSize: "1.4rem" }} />
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "#1A2533", fontSize: "1.2rem" }}
              >
                Recent Bills
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "#9AB0C0",
                  fontSize: "0.75rem",
                  background: "#F0F4F8",
                  px: 1.25,
                  py: 0.4,
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                {loading
                  ? "..."
                  : `${bills.length} record${bills.length !== 1 ? "s" : ""}`}
              </Typography>
            </Box>
            {headerAction}
          </Box>

          {!loading && bills.length === 0 ? (
            <Box
              data-testid="bills-empty"
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 7,
                gap: 1,
              }}
            >
              <ReceiptLongIcon
                sx={{ fontSize: "3rem", color: "#C8D8E8", mb: 1 }}
              />
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, color: "#4A6072" }}
              >
                No bills yet
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "#9AB0C0", textAlign: "center" }}
              >
                Upload your first utility bill to get started
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
                border: "1px solid #EEF3F8",
              }}
            >
              <BillTableContent
                bills={bills}
                loading={loading}
                stickyHeader={false}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <BillTableContent
      bills={bills}
      loading={loading}
      stickyHeader={stickyHeader}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={onSortChange}
    />
  );
}

export default BillsGrid;
