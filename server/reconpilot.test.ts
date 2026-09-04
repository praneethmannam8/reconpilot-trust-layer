import { describe, expect, it } from "vitest";
import { generateSampleData, parseReconCsv, parseSettlementsCsv, parseTransactionsCsv, processRecords, verifyAuditChain } from "../shared/reconpilot";

describe("ReconPilot deterministic trust layer", () => {
  it("generates a ground-truth dataset larger than the minimum demo size", () => {
    const sample = generateSampleData();
    expect(sample.transactions).toHaveLength(64);
    expect(sample.transactions.filter((item) => item.groundTruth === "missing").length).toBeGreaterThanOrEqual(4);
    expect(sample.transactions.filter((item) => item.groundTruth === "mismatch").length).toBeGreaterThanOrEqual(4);
  });

  it("replays to identical cases, routes, and metrics", () => {
    const first = generateSampleData();
    const second = generateSampleData();
    const a = processRecords(first.transactions, first.settlements);
    const b = processRecords(second.transactions, second.settlements);
    expect({ ...a.benchmark, throughput: 0 }).toEqual({ ...b.benchmark, throughput: 0 });
    expect(a.cases.map((item) => item.decision)).toEqual(b.cases.map((item) => item.decision));
  });

  it("refuses missing and conflicting settlement evidence", () => {
    const sample = generateSampleData();
    const result = processRecords(sample.transactions, sample.settlements);
    const missing = result.cases.filter((item) => item.transaction.groundTruth === "missing");
    const mismatch = result.cases.filter((item) => item.transaction.groundTruth === "mismatch");
    expect(missing.every((item) => item.decision === "refused" && item.reason.length > 0 && item.nextStep.length > 0)).toBe(true);
    expect(mismatch.every((item) => item.decision === "refused" && item.signals.amountMismatch)).toBe(true);
  });

  it("validates uploaded facts before processing", () => {
    const csv = "transaction_id,amount,date,description,settlement_id,settlement_amount,ground_truth\ntxn_1,1200,2026-08-20,Orbit Coffee,stl_1,1200,match";
    const parsed = parseReconCsv(csv);
    expect(parsed.transactions[0]?.amount).toBe(1200);
    expect(parsed.settlements[0]?.reference).toBe("stl_1");
    expect(() => parseReconCsv("transaction_id,amount\ntxn_1,not-a-number")).toThrow("Missing required columns");
  });

  it("asserts direct match, rule, refusal, and benchmark behavior", () => {
    const sample = generateSampleData();
    const result = processRecords(sample.transactions, sample.settlements);
    const exact = result.cases.find((item) => item.transaction.groundTruth === "match" && item.matchType === "exact")!;
    const duplicate = result.cases[0]!;
    expect(exact.matchType).toBe("exact");
    expect(duplicate.signals.duplicate).toBe(true);
    expect(duplicate.decision).toBe("refused");
    expect(result.benchmark.total).toBe(64);
    expect(result.benchmark.throughput).toBeGreaterThan(0);
    expect(result.benchmark.autoApprove + result.benchmark.humanReview + result.benchmark.refused).toBe(64);
  });

  it("validates separate transaction and settlement contracts without inventing facts", () => {
    const transactions = parseTransactionsCsv("transaction_id,amount,date,description,settlement_id,ground_truth\ntxn_1,1200,2026-08-20,Orbit Coffee,stl_1,match");
    const settlements = parseSettlementsCsv("settlement_id,amount,date,reference,description\nstl_1,1200,2026-08-20,rzp_1,Orbit Coffee");
    expect(transactions[0]?.settlementId).toBe("stl_1");
    expect(settlements[0]?.amount).toBe(1200);
    expect(() => parseTransactionsCsv("transaction_id,amount\ntxn_1,1200")).toThrow("Transactions CSV missing columns");
    expect(() => parseSettlementsCsv("settlement_id,amount,date,reference,description\nstl_1,not-a-number,2026-08-20,rzp_1,Orbit Coffee")).toThrow("Invalid settlement");
  });

  it("verifies the audit chain and detects a broken link", () => {
    const sample = generateSampleData();
    const result = processRecords(sample.transactions, sample.settlements);
    expect(verifyAuditChain(result.audit)).toBe(true);
    const tampered = result.audit.map((entry) => ({ ...entry }));
    tampered[3]!.previousHash = "tampered";
    expect(verifyAuditChain(tampered)).toBe(false);
  });
});


describe("explicit deterministic contracts", () => {
  it("returns an immutable exact match result", async () => {
    const { matchTransaction } = await import("../shared/deterministic");
    const transaction = { id: "txn_1", amount: 1200, date: "2026-08-20", description: "Orbit Coffee", settlementId: "stl_1", groundTruth: "match" as const };
    const settlement = { id: "stl_1", amount: 1200, date: "2026-08-20", reference: "rzp_1", description: "Orbit Coffee" };
    const result = matchTransaction(transaction, [settlement]);
    expect(result.matchType).toBe("exact");
    expect(result.matchedFields).toEqual(["settlement_id", "amount", "date", "description"]);
    expect(result.confidenceScore).toBe(0.99);
  });

  it("makes refusal state deterministic and independent of model opinion", async () => {
    const { refusalGate, runRiskRules } = await import("../shared/deterministic");
    const transaction = { id: "txn_1", amount: 1200, date: "2026-08-20", description: "Orbit Coffee", groundTruth: "missing" as const };
    const signals = runRiskRules(transaction, undefined, false);
    expect(refusalGate({ signals, confidence: 1, evidenceComplete: false, modelClassification: "auto_approve" }).decision).toBe("refused");
    expect(refusalGate({ signals: { ...signals, missingSettlement: false, amountMismatch: true }, confidence: 1, evidenceComplete: true }).state).toBe("EVIDENCE_CONTRADICTORY");
    expect(refusalGate({ signals: { ...signals, missingSettlement: false }, confidence: 0.5, evidenceComplete: true }).decision).toBe("human_review");
  });
});
