import React from "react";
import { Box, Card, CardContent, Skeleton, Typography } from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import type { AnalyticsSummary } from "../../types";
import styles from "./SpendChart.module.css";

interface SpendChartProps {
  monthlyTotals: AnalyticsSummary["totals_by_month"];
  loading?: boolean;
}

export const SpendChart: React.FC<SpendChartProps> = ({
  monthlyTotals,
  loading = false,
}) => {
  const maxVal = Math.max(...monthlyTotals.map((m) => m.total), 1);

  const formatMonth = (key: string) => {
    const [year, month] = key.split("-");
    return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
      month: "short",
    });
  };

  return (
    <Card className={styles.card} elevation={0} data-testid="spend-chart">
      <CardContent className={styles.content}>
        <Box className={styles.header}>
          <BarChartIcon className={styles.icon} />
          <Typography variant="h5" className={styles.heading}>
            Monthly Spend
          </Typography>
        </Box>

        {loading ? (
          <Box className={styles.chartArea}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} className={styles.barWrapper}>
                <Skeleton
                  variant="rectangular"
                  width={28}
                  height={60 + Math.random() * 60}
                  sx={{ borderRadius: "6px 6px 0 0" }}
                />
                <Skeleton variant="text" width={28} />
              </Box>
            ))}
          </Box>
        ) : monthlyTotals.length === 0 ? (
          <Box className={styles.empty}>
            <BarChartIcon className={styles.emptyIcon} />
            <Typography variant="body2" className={styles.emptyText}>
              No spending data yet
            </Typography>
          </Box>
        ) : (
          <Box className={styles.chartArea} role="img" aria-label="Monthly spending bar chart">
            {monthlyTotals.map((m) => {
              const heightPct = (m.total / maxVal) * 100;
              return (
                <Box
                  key={m.month}
                  className={styles.barWrapper}
                  data-testid="chart-bar"
                >
                  <Typography variant="caption" className={styles.barValue}>
                    ${m.total >= 1000 ? `${(m.total / 1000).toFixed(1)}k` : m.total.toFixed(0)}
                  </Typography>
                  <Box className={styles.barTrack}>
                    <Box
                      className={styles.bar}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      title={`${formatMonth(m.month)}: $${m.total.toFixed(2)}`}
                    />
                  </Box>
                  <Typography variant="caption" className={styles.barLabel}>
                    {formatMonth(m.month)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SpendChart;
