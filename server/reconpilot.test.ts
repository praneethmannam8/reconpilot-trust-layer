import { describe, expect, it } from "vitest";
import { generateSampleData, parseReconCsv, processRecords, verifyAuditChain } from "../shared/reconpilot";

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

  it("verifies the audit chain and detects a broken link", () => {
    const sample = generateSampleData();
    const result = processRecords(sample.transactions, sample.settlements);
    expect(verifyAuditChain(result.audit)).toBe(true);
    const tampered = result.audit.map((entry) => ({ ...entry }));
    tampered[3]!.previousHash = "tampered";
    expect(verifyAuditChain(tampered)).toBe(false);
  });
});
