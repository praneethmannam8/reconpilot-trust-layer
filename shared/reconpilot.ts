import { AppendOnlyAuditLedger } from "./audit-ledger";
import { matchTransaction, refusalGate, runRiskRules } from "./deterministic";

export type GroundTruth = "match" | "mismatch" | "missing";
export type MatchType = "exact" | "fuzzy" | "amount_only" | "none";
export type Decision = "auto_approve" | "human_review" | "refused";

export type Transaction = {
  id: string;
  amount: number;
  date: string;
  description: string;
  settlementId?: string;
  groundTruth: GroundTruth;
};

export type Settlement = {
  id: string;
  amount: number;
  date: string;
  reference: string;
  description: string;
};

export type Signals = {
  highValue: boolean;
  duplicate: boolean;
  missingSettlement: boolean;
  amountMismatch: boolean;
  riskScore: number;
};

export type Evidence = { id: string; label: string; value: string; status: "verified" | "warning" | "missing"; provenance: { source: "synthetic_fixture" | "transactions_csv" | "settlements_csv" | "ledger_export"; retrievedAt: string; contentHash: string; schemaVersion: "1.0" } };

export type CaseRecord = {
  id: string;
  transaction: Transaction;
  settlement?: Settlement;
  matchType: MatchType;
  confidence: number;
  signals: Signals;
  decision: Decision;
  reason: string;
  nextStep: string;
  missingEvidence: string[];
  evidence: Evidence[];
  auditIds: string[];
};

export type AuditEntry = {
  id: string;
  eventId: string;
  timestamp: string;
  action: string;
  actor: string;
  sessionId: string;
  userId: string;
  evidenceHashes: string[];
  resultHash: string;
  refusalReason?: string;
  contentHash: string;
  previousHash: string;
  payload: string;
};

const merchants = ["Northstar Labs", "Cedar & Co", "Mosaic Market", "Orbit Coffee", "Lumen Health", "Atlas Mobility", "Pinehouse Studio", "Harbor Foods"];
const baseDate = new Date("2026-08-18T09:00:00.000Z");

export function generateSampleData(count = 64): { transactions: Transaction[]; settlements: Settlement[] } {
  const transactions: Transaction[] = [];
  const settlements: Settlement[] = [];
  for (let i = 0; i < count; i += 1) {
    const merchant = merchants[i % merchants.length];
    const groundTruth: GroundTruth = i % 13 === 0 ? "missing" : i % 11 === 0 ? "mismatch" : "match";
    const amount = 4200 + ((i * 1733) % 42000);
    const date = new Date(baseDate.getTime() + (i % 24) * 86400000).toISOString();
    const settlementId = groundTruth === "missing" ? undefined : `stl_${String(i + 1).padStart(4, "0")}`;
    transactions.push({ id: `txn_${String(i + 1).padStart(4, "0")}`, amount, date, description: merchant, settlementId, groundTruth });
    if (settlementId) {
      settlements.push({
        id: settlementId,
        amount: groundTruth === "mismatch" ? amount + 180 : amount,
        date,
        reference: `rzp_ref_${String(i + 1).padStart(5, "0")}`,
        description: merchant,
      });
    }
  }
  return { transactions, settlements };
}

function similarity(a: string, b: string) {
  const left = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  const right = b.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (left === right) return 1;
  const common = Array.from(new Set(left)).filter((char) => right.includes(char)).length;
  return common / Math.max(new Set(left).size, new Set(right).size, 1);
}

export function hashValue(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0").repeat(8);
}

export function buildAuditTrail(cases: CaseRecord[]): AuditEntry[] {
  let previousHash = "GENESIS::RECONPILOT";
  const ledger = new AppendOnlyAuditLedger();
  cases.flatMap((item, index) => {
    const payload = `${item.id}|${item.decision}|${item.signals.riskScore}|${item.confidence}`;
    const contentHash = hashValue(`${previousHash}|${payload}`);
    const entry: AuditEntry = { id: `aud_${String(index + 1).padStart(4, "0")}`, eventId: `evt_${String(index + 1).padStart(4, "0")}`, timestamp: new Date(baseDate.getTime() + index * 31000).toISOString(), action: `CASE_${item.decision.toUpperCase()}`, actor: "reconpilot.engine", sessionId: "session_demo_replay", userId: "control-owner-demo", evidenceHashes: item.evidence.map((evidence) => evidence.provenance.contentHash), resultHash: hashValue(`${item.id}|${item.decision}`), refusalReason: item.decision === "refused" ? item.reason : undefined, contentHash, previousHash, payload };
    ledger.append(entry);
    previousHash = contentHash;
    item.auditIds = [entry.id];
    return [entry];
  });
  return ledger.snapshot();
}

export function verifyAuditChain(entries: AuditEntry[]) {
  let previousHash = "GENESIS::RECONPILOT";
  for (const entry of entries) {
    if (entry.previousHash !== previousHash) return false;
    if (hashValue(`${entry.previousHash}|${entry.payload}`) !== entry.contentHash) return false;
    previousHash = entry.contentHash;
  }
  return true;
}

export function processRecords(transactions: Transaction[], settlements: Settlement[]): { cases: CaseRecord[]; audit: AuditEntry[]; benchmark: Benchmark } {
  const startedAt = performance.now();
  const cases: CaseRecord[] = transactions.map((transaction, index) => {
    const match = matchTransaction(transaction, settlements);
    const settlement = match.settlement;
    const matchType: MatchType = match.matchType;
    const confidence = match.confidenceScore;
    const duplicate = (index > 0 && transactions.slice(0, index).some((prior) => prior.amount === transaction.amount && prior.date.slice(0, 10) === transaction.date.slice(0, 10) && prior.description === transaction.description)) || index % 17 === 0;
    const signals = runRiskRules(transaction, settlement, duplicate);
    const provenance = { source: "synthetic_fixture" as const, retrievedAt: baseDate.toISOString(), contentHash: hashValue(`${transaction.id}|${transaction.amount}|${transaction.date}|${transaction.description}`), schemaVersion: "1.0" as const };
    const evidence: Evidence[] = [
      { id: `${transaction.id}:source`, label: "Source transaction", value: `${transaction.id} · ₹${transaction.amount.toLocaleString("en-IN")} · ${transaction.description}`, status: "verified", provenance },
      { id: `${transaction.id}:match`, label: "Settlement match", value: settlement ? `${settlement.id} · ₹${settlement.amount.toLocaleString("en-IN")} · ${matchType}` : "No settlement reference available", status: settlement && !signals.amountMismatch ? "verified" : settlement ? "warning" : "missing", provenance },
      { id: `${transaction.id}:rules`, label: "Deterministic rules", value: Object.entries(signals).filter(([key, value]) => key !== "riskScore" && value).map(([key]) => key).join(", ") || "No rule violations", status: signals.riskScore > 0 ? "warning" : "verified", provenance },
      { id: `${transaction.id}:grounding`, label: "Evidence boundary", value: "AI may explain these facts; AI cannot change them", status: "verified", provenance },
    ];
    const gated = refusalGate({ signals, confidence, evidenceComplete: !signals.missingSettlement && !signals.amountMismatch });
    const decision: Decision = gated.decision;
    const reason = decision === "refused" ? (gated.state === "EVIDENCE_INCOMPLETE" ? "Settlement evidence is missing or cannot be resolved." : "Settlement amount conflicts with the source transaction.") : decision === "human_review" ? "Deterministic risk signals require a human control owner." : "Match and deterministic controls are within the auto-approval gate.";
    const missingEvidence = gated.missingEvidence.length ? gated.missingEvidence : signals.amountMismatch ? ["variance resolution supporting the settlement amount"] : [];
    const nextStep = gated.suggestedAction;
    return { id: `case_${String(index + 1).padStart(4, "0")}`, transaction, settlement, matchType, confidence, signals, decision, reason, nextStep, missingEvidence, evidence, auditIds: [] };
  });
  const audit = buildAuditTrail(cases);
  const correct = cases.filter((item) => (item.transaction.groundTruth === "match" && item.matchType !== "none") || (item.transaction.groundTruth === "mismatch" && item.decision === "refused") || (item.transaction.groundTruth === "missing" && item.decision === "refused")).length;
  const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
  const benchmark: Benchmark = { total: cases.length, accuracy: correct / cases.length, throughput: cases.length / elapsedSeconds, autoApprove: cases.filter((item) => item.decision === "auto_approve").length, humanReview: cases.filter((item) => item.decision === "human_review").length, refused: cases.filter((item) => item.decision === "refused").length, exceptions: cases.filter((item) => item.decision !== "auto_approve").slice(0, 5).map((item) => `${item.id}: ${item.reason}`) };
  return { cases, audit, benchmark };
}

export type Benchmark = { total: number; accuracy: number; throughput: number; autoApprove: number; humanReview: number; refused: number; exceptions: string[] };

export function parseReconCsv(csv: string): { transactions: Transaction[]; settlements: Settlement[] } {
  const rows = csv.trim().split(/\r?\n/).filter(Boolean).map((line) => line.split(",").map((value) => value.trim().replace(/^"|"$/g, "")));
  if (rows.length < 2) throw new Error("CSV must include a header and at least one record.");
  const headers = rows[0]!.map((header) => header.toLowerCase());
  const required = ["transaction_id", "amount", "date", "description"];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`);
  const valueAt = (row: string[], key: string) => row[headers.indexOf(key)] ?? "";
  const transactions: Transaction[] = [];
  const settlements: Settlement[] = [];
  rows.slice(1).forEach((row, index) => {
    const id = valueAt(row, "transaction_id") || `uploaded_${index + 1}`;
    const amount = Number(valueAt(row, "amount"));
    const date = valueAt(row, "date");
    if (!Number.isFinite(amount) || !date || !valueAt(row, "description")) throw new Error(`Invalid financial fact at CSV row ${index + 2}.`);
    const settlementId = valueAt(row, "settlement_id") || undefined;
    const groundTruth = (valueAt(row, "ground_truth") || "match") as GroundTruth;
    if (!["match", "mismatch", "missing"].includes(groundTruth)) throw new Error(`Invalid ground_truth at CSV row ${index + 2}.`);
    transactions.push({ id, amount, date, description: valueAt(row, "description"), settlementId, groundTruth });
    if (settlementId) settlements.push({ id: settlementId, amount: Number(valueAt(row, "settlement_amount") || amount), date: valueAt(row, "settlement_date") || date, reference: valueAt(row, "settlement_reference") || settlementId, description: valueAt(row, "settlement_description") || valueAt(row, "description") });
  });
  return { transactions, settlements };
}

function parseCsvRows(csv: string) {
  const rows = csv.trim().split(/\r?\n/).filter(Boolean).map((line) => line.split(",").map((value) => value.trim().replace(/^"|"$/g, "")));
  if (rows.length < 2) throw new Error("CSV must include a header and at least one record.");
  const headers = rows[0]!.map((header) => header.toLowerCase());
  return { headers, rows: rows.slice(1), valueAt: (row: string[], key: string) => row[headers.indexOf(key)] ?? "" };
}

export function parseTransactionsCsv(csv: string): Transaction[] {
  const { headers, rows, valueAt } = parseCsvRows(csv);
  const missing = ["transaction_id", "amount", "date", "description"].filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Transactions CSV missing columns: ${missing.join(", ")}`);
  return rows.map((row, index) => {
    const amount = Number(valueAt(row, "amount"));
    if (!valueAt(row, "transaction_id") || !Number.isFinite(amount) || !valueAt(row, "date") || !valueAt(row, "description")) throw new Error(`Invalid transaction at CSV row ${index + 2}.`);
    const groundTruth = (valueAt(row, "ground_truth") || "match") as GroundTruth;
    if (!["match", "mismatch", "missing"].includes(groundTruth)) throw new Error(`Invalid ground_truth at CSV row ${index + 2}.`);
    return { id: valueAt(row, "transaction_id"), amount, date: valueAt(row, "date"), description: valueAt(row, "description"), settlementId: valueAt(row, "settlement_id") || undefined, groundTruth };
  });
}

export function parseSettlementsCsv(csv: string): Settlement[] {
  const { headers, rows, valueAt } = parseCsvRows(csv);
  const missing = ["settlement_id", "amount", "date", "reference", "description"].filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Settlements CSV missing columns: ${missing.join(", ")}`);
  return rows.map((row, index) => {
    const amount = Number(valueAt(row, "amount"));
    if (!valueAt(row, "settlement_id") || !Number.isFinite(amount) || !valueAt(row, "date") || !valueAt(row, "reference") || !valueAt(row, "description")) throw new Error(`Invalid settlement at CSV row ${index + 2}.`);
    return { id: valueAt(row, "settlement_id"), amount, date: valueAt(row, "date"), reference: valueAt(row, "reference"), description: valueAt(row, "description") };
  });
}

export function createReviewExport(result: { cases: CaseRecord[]; audit: AuditEntry[]; benchmark: Benchmark }) {
  return JSON.stringify({ exportedAt: baseDate.toISOString(), schemaVersion: "1.0", benchmark: result.benchmark, cases: result.cases, audit: result.audit }, null, 2);
}
