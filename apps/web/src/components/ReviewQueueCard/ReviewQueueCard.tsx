import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Typography,
} from "@mui/material";
import RuleIcon from "@mui/icons-material/Rule";
import type { ReviewQueueItem } from "../../types";
import styles from "./ReviewQueueCard.module.css";

interface ReviewQueueCardProps {
  items: ReviewQueueItem[];
  total: number;
  loading?: boolean;
  onOpenReview: (billPublicId: string) => void;
}

export const ReviewQueueCard: React.FC<ReviewQueueCardProps> = ({
  items,
  total,
  loading = false,
  onOpenReview,
}) => {
  return (
    <Card className={styles.card} elevation={0} data-testid="review-queue-card">
      <CardContent className={styles.content}>
        <Box className={styles.header}>
          <Box className={styles.titleRow}>
            <RuleIcon className={styles.icon} />
            <Typography variant="h5" className={styles.heading}>
              Review Queue
            </Typography>
          </Box>
          <Chip size="small" color="warning" label={`${total} flagged`} />
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={50} />
            ))}
          </Box>
        ) : items.length === 0 ? (
          <Typography className={styles.empty}>No bills currently need review.</Typography>
        ) : (
          <Box>
            {items.map((item) => (
              <Box key={item.bill_id} className={styles.item}>
                <Box className={styles.topRow}>
                  <Typography variant="body2" className={styles.provider}>
                    {item.provider_name}
                  </Typography>
                  <Chip size="small" color="warning" label={`${Math.round(item.overall_confidence * 100)}%`} />
                </Box>
                <Box className={styles.meta}>
                  <Typography className={styles.subtle}>
                    {item.utility_type} - ${item.total_amount_due.toFixed(2)}
                  </Typography>
                  <Button size="small" onClick={() => onOpenReview(item.bill_public_id)}>
                    Review
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewQueueCard;
