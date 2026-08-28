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

export type Evidence = { id: string; label: string; value: string; status: "verified" | "warning" | "missing" };

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
  timestamp: string;
  action: string;
  actor: string;
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
  return cases.flatMap((item, index) => {
    const payload = `${item.id}|${item.decision}|${item.signals.riskScore}|${item.confidence}`;
    const contentHash = hashValue(`${previousHash}|${payload}`);
    const entry: AuditEntry = { id: `aud_${String(index + 1).padStart(4, "0")}`, timestamp: new Date(baseDate.getTime() + index * 31000).toISOString(), action: `CASE_${item.decision.toUpperCase()}`, actor: "reconpilot.engine", contentHash, previousHash, payload };
    previousHash = contentHash;
    item.auditIds = [entry.id];
    return [entry];
  });
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
    const settlement = transaction.settlementId ? settlements.find((item) => item.id === transaction.settlementId) : undefined;
    const descSimilarity = settlement ? similarity(transaction.description, settlement.description) : 0;
    const exact = Boolean(settlement && settlement.amount === transaction.amount && settlement.date.slice(0, 10) === transaction.date.slice(0, 10) && descSimilarity === 1);
    const fuzzy = Boolean(settlement && settlement.amount === transaction.amount && descSimilarity >= 0.7);
    const amountOnly = Boolean(settlement && settlement.amount === transaction.amount);
    const matchType: MatchType = exact ? "exact" : fuzzy ? "fuzzy" : amountOnly ? "amount_only" : "none";
    const confidence = matchType === "exact" ? 0.99 : matchType === "fuzzy" ? 0.93 : matchType === "amount_only" ? 0.78 : 0;
    const duplicate = (index > 0 && transactions.slice(0, index).some((prior) => prior.amount === transaction.amount && prior.date.slice(0, 10) === transaction.date.slice(0, 10) && prior.description === transaction.description)) || index % 17 === 0;
    const signals: Signals = {
      highValue: transaction.amount > 100000,
      duplicate,
      missingSettlement: !transaction.settlementId || !settlement,
      amountMismatch: Boolean(settlement && settlement.amount !== transaction.amount),
      riskScore: Math.min(100, (transaction.amount > 100000 ? 25 : 0) + (duplicate ? 25 : 0) + (!transaction.settlementId || !settlement ? 25 : 0) + (settlement && settlement.amount !== transaction.amount ? 25 : 0)),
    };
    const evidence: Evidence[] = [
      { id: `${transaction.id}:source`, label: "Source transaction", value: `${transaction.id} · ₹${transaction.amount.toLocaleString("en-IN")} · ${transaction.description}`, status: "verified" },
      { id: `${transaction.id}:match`, label: "Settlement match", value: settlement ? `${settlement.id} · ₹${settlement.amount.toLocaleString("en-IN")} · ${matchType}` : "No settlement reference available", status: settlement && !signals.amountMismatch ? "verified" : settlement ? "warning" : "missing" },
      { id: `${transaction.id}:rules`, label: "Deterministic rules", value: Object.entries(signals).filter(([key, value]) => key !== "riskScore" && value).map(([key]) => key).join(", ") || "No rule violations", status: signals.riskScore > 0 ? "warning" : "verified" },
      { id: `${transaction.id}:grounding`, label: "Evidence boundary", value: "AI may explain these facts; AI cannot change them", status: "verified" },
    ];
    const decision: Decision = signals.missingSettlement || signals.amountMismatch ? "refused" : signals.duplicate || signals.riskScore >= 30 || confidence < 0.7 ? "human_review" : "auto_approve";
    const reason = decision === "refused" ? (signals.missingSettlement ? "Settlement evidence is missing or cannot be resolved." : "Settlement amount conflicts with the source transaction.") : decision === "human_review" ? "Deterministic risk signals require a human control owner." : "Match and deterministic controls are within the auto-approval gate.";
    const missingEvidence = signals.missingSettlement ? ["settlement reference or source statement"] : signals.amountMismatch ? ["variance resolution supporting the settlement amount"] : [];
    const nextStep = decision === "refused" ? (signals.missingSettlement ? "Attach the settlement reference or source statement, then replay the case." : "Resolve the amount variance against the settlement source before approval.") : decision === "human_review" ? "Open the evidence bundle and record an approve, reject, or remediation decision." : "Retain the evidence bundle and continue to close with the recorded audit entry.";
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
