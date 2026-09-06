export const uploadStages = { reading: 12, validating: 55, processing: 78, complete: 100 } as const;
export const exportStages = { preparing: 18, serializing: 52, complete: 100 } as const;

export function describeUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : "Invalid CSV. Check the file encoding and required columns.";
  return `${message}${message.includes("Next step") ? "" : " Next step: correct the reported value and upload the file again."} No financial facts were changed.`;
}

export function exportStatus(progress: number | null, status: string) {
  if (progress === null && status) return { label: status, busy: false };
  if (progress === null) return { label: "Preparing export…", busy: false };
  return { label: status || "Preparing verified cases, benchmarks, and audit chain…", busy: true };
}
