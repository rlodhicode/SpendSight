import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useParams } from "react-router-dom";

import { api } from "../api";
import { loadBillDetail, saveBillDetail } from "../store/actions/billDetailActions";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { BillUpdateRequest } from "../types";

type BillDetailPageProps = {
  token: string;
};

const REQUIRED_CONFIDENCE_FIELDS = [
  "header.provider_name",
  "header.billing_period.start_date",
  "header.billing_period.end_date",
  "financials.total_amount_due",
  "header.utility_type",
  "header.account_number",
  "header.due_date",
];

export function BillDetailPage({ token }: BillDetailPageProps) {
  const { billPublicId } = useParams<{ billPublicId: string }>();
  const dispatch = useAppDispatch();
  const { detail, fieldConfidences, loading, error } = useAppSelector((state) => state.billDetailState);
  const [form, setForm] = useState<BillUpdateRequest>({});
  const [saving, setSaving] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docContentType, setDocContentType] = useState<string | null>(null);

  useEffect(() => {
    if (!billPublicId) {
      return;
    }
    dispatch(loadBillDetail(token, billPublicId));
    api.getBillDocument(token, billPublicId).then((documentPayload) => {
      const nextUrl = URL.createObjectURL(documentPayload.blob);
      setDocUrl((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }
        return nextUrl;
      });
      setDocContentType(documentPayload.contentType);
    });
  }, [dispatch, token, billPublicId]);

  useEffect(() => {
    if (!detail) {
      return;
    }
    setForm({
      provider_name: detail.bill.provider_name,
      account_number: detail.bill.account_number ?? undefined,
      utility_type: detail.bill.utility_type,
      billing_period_start: detail.bill.billing_period_start,
      billing_period_end: detail.bill.billing_period_end,
      due_date: detail.bill.due_date ?? undefined,
      total_amount_due: detail.bill.total_amount_due,
      usage_amount: detail.bill.usage_amount ?? undefined,
      usage_unit: detail.bill.usage_unit ?? undefined,
      usage_kwh: detail.bill.usage_kwh ?? undefined,
      usage_gallons: detail.bill.usage_gallons ?? undefined,
      usage_therms: detail.bill.usage_therms ?? undefined,
      previous_balance: detail.bill.previous_balance ?? undefined,
      payments_credits: detail.bill.payments_credits ?? undefined,
      current_charges: detail.bill.current_charges ?? undefined,
    });
  }, [detail]);

  useEffect(() => {
    return () => {
      if (docUrl) {
        URL.revokeObjectURL(docUrl);
      }
    };
  }, [docUrl]);

  const requiredConfidenceRows = useMemo(
    () =>
      REQUIRED_CONFIDENCE_FIELDS.map((fieldName) => {
        const confidence = fieldConfidences.find((row) => row.field_name === fieldName);
        return {
          fieldName,
          score: confidence?.confidence_score ?? 0,
          value: confidence?.field_value ?? null,
          missing: !confidence?.field_value,
        };
      }),
    [fieldConfidences]
  );

  const derivedOverall = useMemo(() => {
    const weights: Record<string, number> = {
      "header.provider_name": 20,
      "header.billing_period.start_date": 15,
      "header.billing_period.end_date": 15,
      "financials.total_amount_due": 25,
      "header.utility_type": 10,
      "header.account_number": 5,
      "header.due_date": 10,
    };
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (!totalWeight) {
      return 0;
    }
    const total = requiredConfidenceRows.reduce(
      (sum, row) => sum + row.score * (weights[row.fieldName] ?? 0),
      0
    );
    return Math.round((total / totalWeight) * 100);
  }, [requiredConfidenceRows]);

  const hasMissingRequired = requiredConfidenceRows.some((row) => row.missing);

  const renderDocument = useMemo(() => {
    if (!docUrl) {
      return <Typography variant="body2">No document available.</Typography>;
    }
    if (docContentType?.includes("pdf")) {
      return (
        <iframe
          src={docUrl}
          title="Bill Document"
          style={{ width: "100%", height: "72vh", minHeight: 700, border: "none" }}
        />
      );
    }
    if (docContentType?.startsWith("image/")) {
      return (
        <Box sx={{ textAlign: "center", height: "72vh", minHeight: 700, overflow: "auto" }}>
          <img
            src={docUrl}
            alt="Bill document"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 12 }}
          />
        </Box>
      );
    }
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography variant="body2">
          This file type cannot be previewed inline.
        </Typography>
        <Button href={docUrl} download={detail?.document.filename} variant="outlined">
          Download Document
        </Button>
      </Box>
    );
  }, [docUrl, docContentType, detail?.document.filename]);

  const handleSave = () => {
    if (!billPublicId) {
      return;
    }
    setSaving(true);
    dispatch(saveBillDetail(token, billPublicId, form)).finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={18} />
        <Typography variant="body2">Loading bill...</Typography>
      </Box>
    );
  }

  if (!billPublicId) {
    return <Alert severity="error">Missing bill id.</Alert>;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Typography variant="h4">
        Bill Detail {detail?.bill.public_id ? `- ${detail.bill.public_id}` : ""}
      </Typography>
      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} md={5}>
          <Card elevation={0}>
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="h6">Extracted Fields</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip size="small" label={detail?.bill.review_status ?? "not_required"} />
                <Chip
                  size="small"
                  color={hasMissingRequired || detail?.bill.review_required ? "warning" : "success"}
                  label={hasMissingRequired || detail?.bill.review_required ? "Needs Review" : "Reviewed/OK"}
                />
                <Chip size="small" color="info" label={`Derived Confidence: ${derivedOverall}%`} />
              </Stack>
              <TextField
                label="Provider Name"
                value={form.provider_name ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, provider_name: event.target.value }))}
              />
              <TextField
                label="Utility Type"
                value={form.utility_type ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, utility_type: event.target.value }))}
              />
              <TextField
                label="Account Number"
                value={form.account_number ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, account_number: event.target.value }))}
              />
              <TextField
                label="Billing Period Start"
                type="date"
                value={form.billing_period_start ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, billing_period_start: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Billing Period End"
                type="date"
                value={form.billing_period_end ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, billing_period_end: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Due Date"
                type="date"
                value={form.due_date ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Total Amount Due"
                type="number"
                value={form.total_amount_due ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    total_amount_due: event.target.value === "" ? undefined : Number(event.target.value),
                  }))
                }
              />
              <TextField
                label="Usage Amount"
                type="number"
                value={form.usage_amount ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    usage_amount: event.target.value === "" ? undefined : Number(event.target.value),
                  }))
                }
              />
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Updates"}
              </Button>

              <Divider />
              <Typography variant="subtitle2">Required Field Confidence</Typography>
              <List dense>
                {requiredConfidenceRows.map((row) => (
                  <ListItem key={row.fieldName} sx={{ px: 0 }}>
                    <ListItemText
                      primary={row.fieldName}
                      secondary={`${Math.round(row.score * 100)}%${row.missing ? " - Missing Value" : ""}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card elevation={0}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Bill Document
              </Typography>
              {renderDocument}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
