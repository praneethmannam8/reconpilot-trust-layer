import { describe, expect, it } from "vitest";
import { enforceAIBoundary, explainCase } from "./ai";
import { generateSampleData, processRecords } from "../shared/reconpilot";

describe("bounded AI layer", () => {
  const result = processRecords(generateSampleData().transactions, generateSampleData().settlements);

  it("falls back deterministically when a provider is unavailable", async () => {
    const refused = result.cases.find((item) => item.decision === "refused")!;
    const output = await explainCase(refused, "openrouter");
    expect(output.provider).toBe("deterministic-fallback");
    expect(output.classification).toBe("refused");
    expect(output.reasoning).toContain("Next step");
  });

  it("forces a refused route to remain refused and removes invalid citations", () => {
    const refused = result.cases.find((item) => item.decision === "refused")!;
    const safe = enforceAIBoundary(refused, { classification: "auto_approve", confidence: 1, reasoning: "unsafe", citedEvidence: ["not-real"], provider: "gemini", fallback: false });
    expect(safe.classification).toBe("refused");
    expect(safe.citedEvidence).toEqual([]);
  });
});
