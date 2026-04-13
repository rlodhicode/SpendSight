import React from "react";
import {
  Box,
  Card,
  CardContent,
  LinearProgress,
  Skeleton,
  Typography,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import type { AnalyticsSummary } from "../../types";
import styles from "./ProviderList.module.css";

interface ProviderListProps {
  providers: AnalyticsSummary["totals_by_provider"];
  totalSpend: number;
  loading?: boolean;
}

const COLORS = [
  "#1B4F72",
  "#17A589",
  "#D68910",
  "#2E86C1",
  "#1D8348",
  "#9B59B6",
];

export const ProviderList: React.FC<ProviderListProps> = ({
  providers,
  totalSpend,
  loading = false,
}) => {
  const sorted = [...providers].sort((a, b) => b.total - a.total);

  return (
    <Card className={styles.card} elevation={0} data-testid="provider-list">
      <CardContent className={styles.content}>
        <Box className={styles.header}>
          <BusinessIcon className={styles.icon} />
          <Typography variant="h5" className={styles.heading}>
            By Provider
          </Typography>
        </Box>

        {!loading && providers.length === 0 ? (
          <Box className={styles.empty}>
            <Typography variant="body2" className={styles.emptyText}>
              No provider data yet
            </Typography>
          </Box>
        ) : (
          <Box className={styles.list}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Box key={i} className={styles.item}>
                    <Box className={styles.itemHeader}>
                      <Skeleton variant="text" width={120} />
                      <Skeleton variant="text" width={60} />
                    </Box>
                    <Skeleton
                      variant="rectangular"
                      height={6}
                      sx={{ borderRadius: 4 }}
                    />
                  </Box>
                ))
              : sorted.map((p, i) => {
                  const pct = totalSpend > 0 ? (p.total / totalSpend) * 100 : 0;
                  const color = COLORS[i % COLORS.length];
                  return (
                    <Box
                      key={p.name}
                      className={styles.item}
                      data-testid="provider-item"
                    >
                      <Box className={styles.itemHeader}>
                        <Box className={styles.nameRow}>
                          <Box
                            className={styles.dot}
                            style={{ background: color }}
                          />
                          <Typography
                            variant="body2"
                            className={styles.name}
                            title={p.name}
                          >
                            {p.name}
                          </Typography>
                        </Box>
                        <Typography variant="body2" className={styles.total}>
                          ${p.total.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box className={styles.progressWrapper}>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          className={styles.progress}
                          sx={{
                            "& .MuiLinearProgress-bar": {
                              background: color,
                              borderRadius: 4,
                            },
                          }}
                        />
                        <Typography variant="caption" className={styles.pct}>
                          {pct.toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ProviderList;
