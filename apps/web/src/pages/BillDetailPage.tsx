import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useParams } from "react-router-dom";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

import { api } from "../api";
import {
  loadBillDetail,
  saveBillDetail,
} from "../store/actions/billDetailActions";
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

type ConfidenceTier = "high" | "medium" | "low" | "missing";

function getConfidenceTier(score: number, missing: boolean): ConfidenceTier {
  if (missing) return "missing";
  if (score >= 0.85) return "high";
  if (score >= 0.6) return "medium";
  return "low";
}

const TIER_COLORS: Record<ConfidenceTier, string> = {
  high: "#1D8348",
  medium: "#D68910",
  low: "#C0392B",
  missing: "#9B59B6",
};

const TIER_BG: Record<ConfidenceTier, string> = {
  high: "transparent",
  medium: "rgba(214,137,16,0.04)",
  low: "rgba(192,57,43,0.04)",
  missing: "rgba(155,89,182,0.04)",
};

const TIER_BORDER: Record<ConfidenceTier, string> = {
  high: "#E8F4FD",
  medium: "#F0B42940",
  low: "#C0392B30",
  missing: "#9B59B630",
};

function ConfidenceDot({
  score,
  missing,
  fieldName,
}: {
  score: number;
  missing: boolean;
  fieldName: string;
}) {
  const tier = getConfidenceTier(score, missing);
  const color = TIER_COLORS[tier];

  const tooltipContent = missing
    ? `${fieldName}: Not extracted`
    : `${fieldName}: ${Math.round(score * 100)}% confidence`;

  const Icon =
    tier === "high"
      ? CheckCircleOutlineIcon
      : tier === "medium"
        ? WarningAmberIcon
        : tier === "missing"
          ? InfoOutlinedIcon
          : ErrorOutlineIcon;

  return (
    <Tooltip title={tooltipContent} placement="right" arrow>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          cursor: "help",
          color,
          ml: 0.5,
          flexShrink: 0,
          "& svg": { fontSize: "1rem" },
        }}
      >
        <Icon fontSize="small" />
      </Box>
    </Tooltip>
  );
}

function FieldRow({
  label,
  fieldKey,
  children,
  confidenceScore,
  missing,
}: {
  label: string;
  fieldKey: string;
  children: React.ReactNode;
  confidenceScore?: number;
  missing?: boolean;
}) {
  const hasCfg = confidenceScore !== undefined;
  const tier = hasCfg
    ? getConfidenceTier(confidenceScore!, missing ?? false)
    : "high";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        border: `1px solid ${hasCfg ? TIER_BORDER[tier] : "#EEF3F8"}`,
        background: hasCfg ? TIER_BG[tier] : "transparent",
        transition: "background 0.2s",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            color: "#7A92A6",
            fontSize: "0.68rem",
          }}
        >
          {label}
        </Typography>
        {hasCfg && (
          <ConfidenceDot
            score={confidenceScore!}
            missing={missing ?? false}
            fieldName={fieldKey}
          />
        )}
      </Box>
      {children}
    </Box>
  );
}

export function BillDetailPage({ token }: BillDetailPageProps) {
  const { billPublicId } = useParams<{ billPublicId: string }>();
  const dispatch = useAppDispatch();
  const { detail, fieldConfidences, loading, error } = useAppSelector(
    (state) => state.billDetailState,
  );
  const [form, setForm] = useState<BillUpdateRequest>({});
  const [saving, setSaving] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docContentType, setDocContentType] = useState<string | null>(null);

  useEffect(() => {
    if (!billPublicId) return;
    dispatch(loadBillDetail(token, billPublicId));
    api.getBillDocument(token, billPublicId).then((documentPayload) => {
      const nextUrl = URL.createObjectURL(documentPayload.blob);
      setDocUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return nextUrl;
      });
      setDocContentType(documentPayload.contentType);
    });
  }, [dispatch, token, billPublicId]);

  useEffect(() => {
    if (!detail) return;
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
      if (docUrl) URL.revokeObjectURL(docUrl);
    };
  }, [docUrl]);

  // Build a map from field_name -> confidence row for quick lookup
  const confidenceMap = useMemo(() => {
    const map: Record<string, { score: number; missing: boolean }> = {};
    for (const row of fieldConfidences) {
      map[row.field_name] = {
        score: row.confidence_score,
        missing:
          row.field_value === null ||
          row.field_value === undefined ||
          row.field_value === "",
      };
    }
    return map;
  }, [fieldConfidences]);

  const cfgFor = (fieldKey: string) => confidenceMap[fieldKey];

  const hasMissingRequired = REQUIRED_CONFIDENCE_FIELDS.some(
    (f) => confidenceMap[f]?.missing,
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
    const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
    if (!totalWeight) return 0;
    const total = REQUIRED_CONFIDENCE_FIELDS.reduce((sum, f) => {
      const c = confidenceMap[f];
      return sum + (c ? c.score : 0) * (weights[f] ?? 0);
    }, 0);
    return Math.round((total / totalWeight) * 100);
  }, [confidenceMap]);

  const renderDocument = useMemo(() => {
    if (!docUrl)
      return (
        <Typography variant="body2" sx={{ color: "#9AB0C0" }}>
          No document available.
        </Typography>
      );
    if (docContentType?.includes("pdf")) {
      return (
        <iframe
          src={docUrl}
          title="Bill Document"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            borderRadius: 8,
          }}
        />
      );
    }
    if (docContentType?.startsWith("image/")) {
      return (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            overflow: "auto",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <img
            src={docUrl}
            alt="Bill document"
            style={{ maxWidth: "100%", objectFit: "contain", borderRadius: 8 }}
          />
        </Box>
      );
    }
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pt: 2 }}>
        <Typography variant="body2">
          This file type cannot be previewed inline.
        </Typography>
        <Button
          href={docUrl}
          download={detail?.document.filename}
          variant="outlined"
        >
          Download Document
        </Button>
      </Box>
    );
  }, [docUrl, docContentType, detail]);

  const handleSave = () => {
    if (!billPublicId) return;
    setSaving(true);
    dispatch(saveBillDetail(token, billPublicId, form)).finally(() =>
      setSaving(false),
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, pt: 4 }}>
        <CircularProgress size={18} />
        <Typography variant="body2">Loading bill...</Typography>
      </Box>
    );
  }

  if (!billPublicId) {
    return <Alert severity="error">Missing bill id.</Alert>;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        height: "calc(100vh - 64px)",
        overflow: "hidden",
        px: 3,
      }}
    >
      {/* Page header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 0,
          py: 2,
          borderBottom: "1px solid #D5E3EE",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1A2533" }}>
            Bill {detail?.bill.public_id ?? billPublicId}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              size="small"
              color={
                hasMissingRequired || detail?.bill.review_required
                  ? "warning"
                  : "success"
              }
              label={
                hasMissingRequired || detail?.bill.review_required
                  ? "Needs Review"
                  : "OK"
              }
              sx={{ fontWeight: 600, fontSize: "0.72rem" }}
            />
            <Chip
              size="small"
              variant="outlined"
              label={`${derivedOverall}% confidence`}
              sx={{
                fontWeight: 600,
                fontSize: "0.72rem",
                borderColor:
                  derivedOverall >= 85
                    ? "#1D8348"
                    : derivedOverall >= 60
                      ? "#D68910"
                      : "#C0392B",
                color:
                  derivedOverall >= 85
                    ? "#1D8348"
                    : derivedOverall >= 60
                      ? "#D68910"
                      : "#C0392B",
              }}
            />
          </Stack>
        </Box>
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Updates"}
        </Button>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      ) : null}

      {/* Two-column body */}
      <Box sx={{ flex: 1, overflow: "hidden", display: "flex", gap: 0 }}>
        {/* Left: fields ~40% */}
        <Box
          sx={{
            width: "40%",
            flexShrink: 0,
            overflowY: "auto",
            borderRight: "1px solid #D5E3EE",
            pr: 3,
            pt: 2.5,
            pb: 3,
          }}
        >
          {/* Legend */}
          <Box sx={{ display: "flex", gap: 2, mb: 2.5, flexWrap: "wrap" }}>
            {(["high", "medium", "low", "missing"] as ConfidenceTier[]).map(
              (tier) => (
                <Box
                  key={tier}
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: TIER_COLORS[tier],
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#7A92A6",
                      fontSize: "0.68rem",
                      textTransform: "capitalize",
                    }}
                  >
                    {tier === "high"
                      ? "High (≥85%)"
                      : tier === "medium"
                        ? "Medium (60–84%)"
                        : tier === "low"
                          ? "Low (<60%)"
                          : "Not extracted"}
                  </Typography>
                </Box>
              ),
            )}
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {/* Header fields */}
            <Typography
              variant="overline"
              sx={{ color: "#9AB0C0", fontSize: "0.65rem", letterSpacing: 1 }}
            >
              Provider Info
            </Typography>

            <FieldRow
              label="Provider Name"
              fieldKey="header.provider_name"
              confidenceScore={cfgFor("header.provider_name")?.score}
              missing={cfgFor("header.provider_name")?.missing}
            >
              <TextField
                size="small"
                fullWidth
                value={form.provider_name ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, provider_name: e.target.value }))
                }
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: { fontWeight: 600, color: "#1A2533" },
                }}
              />
            </FieldRow>

            <FieldRow
              label="Utility Type"
              fieldKey="header.utility_type"
              confidenceScore={cfgFor("header.utility_type")?.score}
              missing={cfgFor("header.utility_type")?.missing}
            >
              <TextField
                size="small"
                fullWidth
                value={form.utility_type ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, utility_type: e.target.value }))
                }
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: { fontWeight: 600, color: "#1A2533" },
                }}
              />
            </FieldRow>

            <FieldRow
              label="Account Number"
              fieldKey="header.account_number"
              confidenceScore={cfgFor("header.account_number")?.score}
              missing={cfgFor("header.account_number")?.missing}
            >
              <TextField
                size="small"
                fullWidth
                value={form.account_number ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, account_number: e.target.value }))
                }
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: { fontWeight: 600, color: "#1A2533" },
                }}
              />
            </FieldRow>

            <Divider sx={{ my: 0.5 }} />
            <Typography
              variant="overline"
              sx={{ color: "#9AB0C0", fontSize: "0.65rem", letterSpacing: 1 }}
            >
              Billing Period
            </Typography>

            <FieldRow
              label="Period Start"
              fieldKey="header.billing_period.start_date"
              confidenceScore={
                cfgFor("header.billing_period.start_date")?.score
              }
              missing={cfgFor("header.billing_period.start_date")?.missing}
            >
              <TextField
                size="small"
                type="date"
                fullWidth
                value={form.billing_period_start ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    billing_period_start: e.target.value,
                  }))
                }
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: { fontWeight: 600, color: "#1A2533" },
                }}
                InputLabelProps={{ shrink: true }}
              />
            </FieldRow>

            <FieldRow
              label="Period End"
              fieldKey="header.billing_period.end_date"
              confidenceScore={cfgFor("header.billing_period.end_date")?.score}
              missing={cfgFor("header.billing_period.end_date")?.missing}
            >
              <TextField
                size="small"
                type="date"
                fullWidth
                value={form.billing_period_end ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, billing_period_end: e.target.value }))
                }
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: { fontWeight: 600, color: "#1A2533" },
                }}
                InputLabelProps={{ shrink: true }}
              />
            </FieldRow>

            <FieldRow
              label="Due Date"
              fieldKey="header.due_date"
              confidenceScore={cfgFor("header.due_date")?.score}
              missing={cfgFor("header.due_date")?.missing}
            >
              <TextField
                size="small"
                type="date"
                fullWidth
                value={form.due_date ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, due_date: e.target.value }))
                }
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: { fontWeight: 600, color: "#1A2533" },
                }}
                InputLabelProps={{ shrink: true }}
              />
            </FieldRow>

            <Divider sx={{ my: 0.5 }} />
            <Typography
              variant="overline"
              sx={{ color: "#9AB0C0", fontSize: "0.65rem", letterSpacing: 1 }}
            >
              Financials
            </Typography>

            <FieldRow
              label="Total Amount Due"
              fieldKey="financials.total_amount_due"
              confidenceScore={cfgFor("financials.total_amount_due")?.score}
              missing={cfgFor("financials.total_amount_due")?.missing}
            >
              <TextField
                size="small"
                type="number"
                fullWidth
                value={form.total_amount_due ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    total_amount_due:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  }))
                }
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    fontWeight: 700,
                    color: "#1A2533",
                    fontSize: "1.05rem",
                  },
                }}
              />
            </FieldRow>

            <FieldRow
              label="Previous Balance"
              fieldKey="financials.previous_balance"
              confidenceScore={cfgFor("financials.previous_balance")?.score}
              missing={cfgFor("financials.previous_balance")?.missing}
            >
              <TextField
                size="small"
                type="number"
                fullWidth
                value={form.previous_balance ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    previous_balance:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  }))
                }
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: { fontWeight: 600, color: "#1A2533" },
                }}
              />
            </FieldRow>

            <FieldRow
              label="Payments / Credits"
              fieldKey="financials.payments_credits"
              confidenceScore={cfgFor("financials.payments_credits")?.score}
              missing={cfgFor("financials.payments_credits")?.missing}
            >
              <TextField
                size="small"
                type="number"
                fullWidth
                value={form.payments_credits ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    payments_credits:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  }))
                }
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: { fontWeight: 600, color: "#1A2533" },
                }}
              />
            </FieldRow>

            <FieldRow
              label="Current Charges"
              fieldKey="financials.current_charges"
              confidenceScore={cfgFor("financials.current_charges")?.score}
              missing={cfgFor("financials.current_charges")?.missing}
            >
              <TextField
                size="small"
                type="number"
                fullWidth
                value={form.current_charges ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    current_charges:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  }))
                }
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: { fontWeight: 600, color: "#1A2533" },
                }}
              />
            </FieldRow>

            <Divider sx={{ my: 0.5 }} />
            <Typography
              variant="overline"
              sx={{ color: "#9AB0C0", fontSize: "0.65rem", letterSpacing: 1 }}
            >
              Usage
            </Typography>

            <FieldRow
              label="Usage Amount"
              fieldKey="usage.amount"
              confidenceScore={cfgFor("usage.amount")?.score}
              missing={cfgFor("usage.amount")?.missing}
            >
              <TextField
                size="small"
                type="number"
                fullWidth
                value={form.usage_amount ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    usage_amount:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  }))
                }
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: { fontWeight: 600, color: "#1A2533" },
                }}
              />
            </FieldRow>

            <FieldRow
              label="Usage Unit"
              fieldKey="usage.unit"
              confidenceScore={cfgFor("usage.unit")?.score}
              missing={cfgFor("usage.unit")?.missing}
            >
              <TextField
                size="small"
                fullWidth
                value={form.usage_unit ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, usage_unit: e.target.value }))
                }
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: { fontWeight: 600, color: "#1A2533" },
                }}
              />
            </FieldRow>
          </Box>
        </Box>

        {/* Right: document ~60% */}
        <Box
          sx={{
            flex: 1,
            overflow: "hidden",
            pl: 3,
            pt: 2.5,
            pb: 3,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: "#9AB0C0",
              fontSize: "0.65rem",
              letterSpacing: 1,
              mb: 1.5,
              display: "block",
            }}
          >
            Bill Document
          </Typography>
          <Box
            sx={{
              flex: 1,
              overflow: "hidden",
              borderRadius: 2,
              border: "1px solid #D5E3EE",
              background: "#F7FAFC",
            }}
          >
            {renderDocument}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
