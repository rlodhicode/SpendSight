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
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useParams } from "react-router-dom";

import { api } from "../api";
import type { BillDetail, BillUpdateRequest } from "../types";

type BillDetailPageProps = {
  token: string;
};

export function BillDetailPage({ token }: BillDetailPageProps) {
  const { billId } = useParams<{ billId: string }>();
  const [detail, setDetail] = useState<BillDetail | null>(null);
  const [form, setForm] = useState<BillUpdateRequest>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docContentType, setDocContentType] = useState<string | null>(null);

  useEffect(() => {
    if (!billId) {
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [billDetail, documentPayload] = await Promise.all([
          api.getBillDetail(token, billId),
          api.getBillDocument(token, billId),
        ]);
        const nextUrl = URL.createObjectURL(documentPayload.blob);
        setDetail(billDetail);
        setForm({
          provider_name: billDetail.bill.provider_name,
          account_number: billDetail.bill.account_number ?? undefined,
          utility_type: billDetail.bill.utility_type,
          billing_period_start: billDetail.bill.billing_period_start,
          billing_period_end: billDetail.bill.billing_period_end,
          due_date: billDetail.bill.due_date ?? undefined,
          total_amount_due: billDetail.bill.total_amount_due,
          usage_amount: billDetail.bill.usage_amount ?? undefined,
          usage_unit: billDetail.bill.usage_unit ?? undefined,
          usage_kwh: billDetail.bill.usage_kwh ?? undefined,
          usage_gallons: billDetail.bill.usage_gallons ?? undefined,
          usage_therms: billDetail.bill.usage_therms ?? undefined,
          previous_balance: billDetail.bill.previous_balance ?? undefined,
          payments_credits: billDetail.bill.payments_credits ?? undefined,
          current_charges: billDetail.bill.current_charges ?? undefined,
        });
        setDocUrl((previous) => {
          if (previous) {
            URL.revokeObjectURL(previous);
          }
          return nextUrl;
        });
        setDocContentType(documentPayload.contentType);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    void load();

  }, [token, billId]);

  useEffect(() => {
    return () => {
      if (docUrl) {
        URL.revokeObjectURL(docUrl);
      }
    };
  }, [docUrl]);

  const renderDocument = useMemo(() => {
    if (!docUrl) {
      return <Typography variant="body2">No document available.</Typography>;
    }
    if (docContentType?.includes("pdf")) {
      return <iframe src={docUrl} title="Bill Document" style={{ width: "100%", minHeight: 760, border: "none" }} />;
    }
    if (docContentType?.startsWith("image/")) {
      return (
        <Box sx={{ textAlign: "center" }}>
          <img src={docUrl} alt="Bill document" style={{ maxWidth: "100%", borderRadius: 12 }} />
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

  const handleSave = async () => {
    if (!billId) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateBill(token, billId, form);
      setDetail(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={18} />
        <Typography variant="body2">Loading bill...</Typography>
      </Box>
    );
  }

  if (!billId) {
    return <Alert severity="error">Missing bill id.</Alert>;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Typography variant="h4">Bill Detail</Typography>
      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} md={5}>
          <Card elevation={0}>
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="h6">Extracted Fields</Typography>
              <Stack direction="row" spacing={1}>
                <Chip size="small" label={detail?.bill.review_status ?? "not_required"} />
                <Chip
                  size="small"
                  color={detail?.bill.review_required ? "warning" : "success"}
                  label={detail?.bill.review_required ? "Needs Review" : "Reviewed/OK"}
                />
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
              <TextField
                label="Usage Unit"
                value={form.usage_unit ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, usage_unit: event.target.value }))}
              />
              <TextField
                label="Previous Balance"
                type="number"
                value={form.previous_balance ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    previous_balance: event.target.value === "" ? undefined : Number(event.target.value),
                  }))
                }
              />
              <TextField
                label="Payments / Credits"
                type="number"
                value={form.payments_credits ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    payments_credits: event.target.value === "" ? undefined : Number(event.target.value),
                  }))
                }
              />
              <TextField
                label="Current Charges"
                type="number"
                value={form.current_charges ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    current_charges: event.target.value === "" ? undefined : Number(event.target.value),
                  }))
                }
              />

              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Updates"}
              </Button>

              <Divider />
              <Typography variant="subtitle2">Recent Edits</Typography>
              {(detail?.edits ?? []).slice(0, 8).map((edit) => (
                <Typography key={`${edit.field_name}-${edit.edited_at}`} variant="caption">
                  {edit.field_name}: {edit.previous_value ?? "null"} → {edit.updated_value ?? "null"} ({new Date(edit.edited_at).toLocaleString()})
                </Typography>
              ))}
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
