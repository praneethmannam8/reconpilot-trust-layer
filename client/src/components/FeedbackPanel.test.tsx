import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FeedbackPanel } from "./FeedbackPanel";

describe("FeedbackPanel rendered states", () => {
  it("renders an accessible upload progressbar and live status", () => {
    const html = renderToStaticMarkup(<FeedbackPanel kind="upload" progress={55} status="Validating headers…" />);
    expect(html).toContain('role="status"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="55"');
    expect(html).toContain("Validating headers");
  });

  it("renders an export success status without a fake progress value", () => {
    const html = renderToStaticMarkup(<FeedbackPanel kind="export" progress={null} status="JSON export downloaded" />);
    expect(html).toContain("JSON export downloaded");
    expect(html).not.toContain('role="progressbar"');
  });

  it("renders detailed validation failure as an alert", () => {
    const html = renderToStaticMarkup(<FeedbackPanel kind="upload" progress={null} status="Upload rejected" error="CSV row 4, field amount: a numeric amount is required. Next step: correct this value. No financial facts were changed." />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("CSV row 4, field amount");
    expect(html).toContain("No financial facts were changed");
  });
});
