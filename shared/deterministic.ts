import type { Decision, Settlement, Signals, Transaction } from "./reconpilot";

export type ImmutableMatchResult = {
  matchId: string;
  settlement?: Settlement;
  matchType: "exact" | "fuzzy" | "amount_only" | "none";
  confidenceScore: number;
  matchedFields: string[];
  unmatchedReason?: string;
};

export function matchTransaction(transaction: Transaction, settlements: Settlement[]): ImmutableMatchResult {
  const settlement = transaction.settlementId ? settlements.find((item) => item.id === transaction.settlementId) : undefined;
  if (!settlement) return { matchId: `${transaction.id}:none`, matchType: "none", confidenceScore: 0, matchedFields: [], unmatchedReason: "No settlement reference resolved." };
  const matchedFields = ["settlement_id"];
  if (settlement.amount === transaction.amount) matchedFields.push("amount");
  if (settlement.date.slice(0, 10) === transaction.date.slice(0, 10)) matchedFields.push("date");
  if (settlement.description === transaction.description) matchedFields.push("description");
  const exact = matchedFields.length === 4;
  const amountOnly = matchedFields.length === 2 && matchedFields.includes("amount");
  return { matchId: `${transaction.id}:${settlement.id}`, settlement, matchType: exact ? "exact" : amountOnly ? "amount_only" : "fuzzy", confidenceScore: exact ? 0.99 : amountOnly ? 0.78 : 0.72, matchedFields, unmatchedReason: exact ? undefined : "Not all deterministic fields matched." };
}

export function runRiskRules(transaction: Transaction, settlement: Settlement | undefined, duplicate: boolean): Signals {
  const missingSettlement = !transaction.settlementId || !settlement;
  const amountMismatch = Boolean(settlement && settlement.amount !== transaction.amount);
  const highValue = transaction.amount > 100000;
  return { highValue, duplicate, missingSettlement, amountMismatch, riskScore: Math.min(100, (highValue ? 25 : 0) + (duplicate ? 25 : 0) + (missingSettlement ? 25 : 0) + (amountMismatch ? 25 : 0)) };
}

export function refusalGate(input: { signals: Signals; confidence: number; evidenceComplete: boolean; modelClassification?: Decision }) {
  if (!input.evidenceComplete || input.signals.missingSettlement) return { decision: "refused" as const, state: "EVIDENCE_INCOMPLETE" as const, missingEvidence: ["settlement reference or source statement"], suggestedAction: "Attach the missing settlement evidence and replay the case." };
  if (input.signals.amountMismatch) return { decision: "refused" as const, state: "EVIDENCE_CONTRADICTORY" as const, missingEvidence: [], suggestedAction: "Resolve the amount variance against the settlement source before approval." };
  if (input.confidence < 0.7 || input.signals.riskScore >= 30 || input.signals.duplicate || input.modelClassification === "human_review") return { decision: "human_review" as const, state: "AMBIGUOUS_MATCH" as const, missingEvidence: [], suggestedAction: "Review the candidate match and record an accountable human decision." };
  return { decision: input.modelClassification === "refused" ? "refused" as const : "auto_approve" as const, state: "CLEAR" as const, missingEvidence: [], suggestedAction: "Retain the evidence bundle and continue with the recorded route." };
}
