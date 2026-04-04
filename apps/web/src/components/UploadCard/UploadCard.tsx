import React, { useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Alert,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import styles from "./UploadCard.module.css";

const UTILITY_OPTIONS = [
  { value: "electricity", label: "⚡ Electricity" },
  { value: "water", label: "💧 Water" },
  { value: "gas", label: "🔥 Gas" },
  { value: "internet", label: "🌐 Internet" },
];

const ACCEPTED_TYPES = ".pdf,.png,.jpg,.jpeg";

interface UploadCardProps {
  onUpload: (utilityType: string, file: File) => Promise<void>;
  uploading?: boolean;
  error?: string | null;
}

export const UploadCard: React.FC<UploadCardProps> = ({
  onUpload,
  uploading = false,
  error,
}) => {
  const [utilityType, setUtilityType] = useState("electricity");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0] ?? null;
    setFile(dropped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    await onUpload(utilityType, file);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Card className={styles.card} elevation={0} data-testid="upload-card">
      <CardContent className={styles.content}>
        <Typography variant="h5" className={styles.heading}>
          Upload Bill
        </Typography>
        <Typography variant="body2" className={styles.subheading}>
          Upload a utility bill to extract and analyze spending data
        </Typography>

        {error && (
          <Alert severity="error" className={styles.alert} role="alert">
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} className={styles.form} noValidate>
          <FormControl fullWidth>
            <InputLabel id="utility-type-label">Utility Type</InputLabel>
            <Select
              labelId="utility-type-label"
              value={utilityType}
              onChange={(e) => setUtilityType(e.target.value)}
              label="Utility Type"
              inputProps={{ "data-testid": "utility-type-select" }}
            >
              {UTILITY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box
            className={`${styles.dropzone} ${dragOver ? styles.dragOver : ""} ${file ? styles.hasFile : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload file area"
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            data-testid="dropzone"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className={styles.hiddenInput}
              data-testid="file-input"
              aria-label="Choose file"
            />
            {file ? (
              <Box className={styles.filePreview}>
                <AttachFileIcon className={styles.fileIcon} />
                <Box>
                  <Typography variant="body2" className={styles.fileName}>
                    {file.name}
                  </Typography>
                  <Typography variant="caption" className={styles.fileSize}>
                    {(file.size / 1024).toFixed(1)} KB
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box className={styles.dropzoneContent}>
                <CloudUploadIcon className={styles.uploadIcon} />
                <Typography variant="body2" className={styles.dropText}>
                  Drop file here or <span className={styles.browseLink}>browse</span>
                </Typography>
                <Typography variant="caption" className={styles.acceptedTypes}>
                  PDF, PNG, JPG, JPEG
                </Typography>
              </Box>
            )}
          </Box>

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={uploading || !file}
            data-testid="upload-button"
            startIcon={
              uploading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <CloudUploadIcon />
              )
            }
          >
            {uploading ? "Uploading…" : "Upload & Analyze"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default UploadCard;
