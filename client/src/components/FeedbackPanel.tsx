import React from "react";
import { AlertTriangle, CheckCircle2, Download, Upload } from "lucide-react";

type FeedbackPanelProps = { kind: "upload" | "export"; progress: number | null; status: string; error?: string };

export function FeedbackPanel({ kind, progress, status, error }: FeedbackPanelProps) {
  const isUpload = kind === "upload";
  const label = error ? "CSV validation failed" : status || (isUpload ? "Preparing upload…" : "Preparing export…");
  return <>
    {(progress !== null || status) && <div className={`feedback-card ${isUpload ? "upload-feedback" : "export-feedback"}`} role="status" aria-live="polite"><div className="feedback-heading"><span>{isUpload ? <Upload size={15} /> : <Download size={15} />} {label}</span><b>{progress ?? 0}%</b></div>{progress !== null && <div className="progress-track" role="progressbar" aria-label={isUpload ? "CSV upload progress" : "JSON export progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>}</div>}
    {error && <div className="upload-error" role="alert"><AlertTriangle size={15} /><div><b>CSV validation failed</b><span>{error}</span></div></div>}
    {progress === 100 && !error && <span className="sr-only"><CheckCircle2 /> {isUpload ? "Upload complete" : "Export complete"}</span>}
  </>;
}
