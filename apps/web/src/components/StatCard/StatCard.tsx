import React from "react";
import { Box, Card, CardContent, Typography, Skeleton } from "@mui/material";
import styles from "./StatCard.module.css";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  color?: "primary" | "secondary" | "success" | "warning";
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  color = "primary",
  loading = false,
}) => {
  return (
    <Card
      className={`${styles.card} ${styles[color]}`}
      elevation={0}
      data-testid="stat-card"
    >
      <CardContent className={styles.content}>
        <Box className={styles.iconWrapper}>{icon}</Box>
        <Box className={styles.textWrapper}>
          <Typography variant="caption" className={styles.title}>
            {title}
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={80} height={40} />
          ) : (
            <Typography variant="h4" className={styles.value} data-testid={`stat-value-${title.toLowerCase().replace(/\s+/g, "-")}`}>
              {value}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="caption" className={styles.subtitle}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
