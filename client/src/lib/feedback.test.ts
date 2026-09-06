import { describe, expect, it } from "vitest";
import { describeUploadError, exportStages, exportStatus, uploadStages } from "./feedback";

describe("feedback states", () => {
  it("provides monotonic upload and export stages", () => {
    expect([uploadStages.reading, uploadStages.validating, uploadStages.processing, uploadStages.complete]).toEqual([12, 55, 78, 100]);
    expect([exportStages.preparing, exportStages.serializing, exportStages.complete]).toEqual([18, 52, 100]);
  });

  it("keeps financial facts unchanged in detailed upload errors", () => {
    expect(describeUploadError(new Error("CSV row 4, field amount: a numeric amount is required"))).toContain("Next step");
    expect(describeUploadError(new Error("CSV row 4, field amount: a numeric amount is required"))).toContain("No financial facts were changed");
  });

  it("reports export busy and completion states", () => {
    expect(exportStatus(52, "Serializing verified data…").busy).toBe(true);
    expect(exportStatus(null, "JSON export downloaded")).toEqual({ label: "JSON export downloaded", busy: false });
  });
});
