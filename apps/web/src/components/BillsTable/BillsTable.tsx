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
  Tooltip,
  Typography,
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import type { BillRecord } from "../../types";
import styles from "./BillsTable.module.css";

interface BillsTableProps {
  bills: BillRecord[];
  loading?: boolean;
}

const utilityColor: Record<string, "primary" | "secondary" | "warning" | "success" | "default"> = {
  electricity: "warning",
  electric: "warning",
  water: "primary",
  gas: "secondary",
  waste: "default",
  internet: "success",
};

const confidenceColor = (score: number): string => {
  if (score >= 0.85) return "#1d8348";
  if (score >= 0.6) return "#d68910";
  return "#c0392b";
};

export const BillsTable: React.FC<BillsTableProps> = ({
  bills,
  loading = false,
}) => {
  return (
    <Card className={styles.card} elevation={0} data-testid="bills-table">
      <CardContent className={styles.cardContent}>
        <Box className={styles.header}>
          <Box className={styles.titleRow}>
            <ReceiptLongIcon className={styles.titleIcon} />
            <Typography variant="h5" className={styles.heading}>
              Recent Bills
            </Typography>
          </Box>
          <Typography variant="caption" className={styles.count}>
            {loading ? "…" : `${bills.length} record${bills.length !== 1 ? "s" : ""}`}
          </Typography>
        </Box>

        {!loading && bills.length === 0 ? (
          <Box className={styles.empty} data-testid="bills-empty">
            <ReceiptLongIcon className={styles.emptyIcon} />
            <Typography variant="body1" className={styles.emptyText}>
              No bills yet
            </Typography>
            <Typography variant="caption" className={styles.emptySubtext}>
              Upload your first utility bill to get started
            </Typography>
          </Box>
        ) : (
          <TableContainer className={styles.tableContainer}>
            <Table size="small" aria-label="Recent bills">
              <TableHead>
                <TableRow>
                  <TableCell>Provider</TableCell>
                  <TableCell>Utility</TableCell>
                  <TableCell>Period End</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="center">Review</TableCell>
                  <TableCell align="right">Confidence</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton variant="text" width="80%" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : bills.map((bill) => (
                      <TableRow
                        key={bill.id}
                        className={styles.row}
                        data-testid="bill-row"
                      >
                        <TableCell className={styles.providerCell}>
                          <Typography variant="body2" className={styles.providerName}>
                            {bill.provider_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={bill.utility_type}
                            size="small"
                            color={utilityColor[bill.utility_type] ?? "default"}
                            variant="outlined"
                            className={styles.utilityChip}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" className={styles.date}>
                            {new Date(bill.billing_period_end).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" className={styles.amount}>
                            ${bill.total_amount_due.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {bill.review_required ? (
                            <Chip size="small" color="warning" label="Needs Review" />
                          ) : (
                            <Chip size="small" color="success" label="Reviewed/OK" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip
                            title={`${(bill.confidence_score * 100).toFixed(0)}% extraction confidence`}
                          >
                            <Typography
                              variant="body2"
                              className={styles.confidence}
                              style={{ color: confidenceColor(bill.confidence_score) }}
                            >
                              {(bill.confidence_score * 100).toFixed(0)}%
                            </Typography>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default BillsTable;
