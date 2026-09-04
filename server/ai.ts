import { invokeLLM } from "./_core/llm";
import type { CaseRecord, Decision } from "../shared/reconpilot";

export type BoundedAIResult = {
  classification: Decision;
  confidence: number;
  reasoning: string;
  citedEvidence: string[];
  provider: "gemini" | "openrouter" | "deterministic-fallback";
  fallback: boolean;
};

const PROJECT_LOCK = `You are a bounded explanation specialist inside ReconPilot, an evidence-driven AI Finance Controller Trust Layer. Deterministic application code owns every financial fact, match, risk signal, route, benchmark metric, and audit hash. You may explain or classify supplied facts, but you must never alter them, invent evidence, override a deterministic route, or perform an irreversible action. If evidence is incomplete or contradictory, classify as refused and state the exact missing evidence and next step. Cite only supplied evidence IDs. Return only the requested JSON object.`;

const RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "reconpilot_bounded_case_explanation",
    strict: true,
    schema: {
      type: "object",
      properties: {
        classification: { type: "string", enum: ["auto_approve", "human_review", "refused"] },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        reasoning: { type: "string", minLength: 1, maxLength: 1200 },
        citedEvidence: { type: "array", items: { type: "string" }, maxItems: 12 },
      },
      required: ["classification", "confidence", "reasoning", "citedEvidence"],
      additionalProperties: false,
    },
  },
};

function fallbackFor(item: CaseRecord): BoundedAIResult {
  const classification = item.decision;
  const citedEvidence = item.evidence.filter((evidence) => evidence.status !== "missing").map((evidence) => evidence.id);
  return {
    classification,
    confidence: Math.min(item.confidence, classification === "refused" ? 0.99 : 0.94),
    reasoning: classification === "refused" ? `${item.reason} Next step: ${item.nextStep}` : `Deterministic controls support the ${classification.replace("_", " ")} route. AI explanation is subordinate to the supplied evidence bundle.`,
    citedEvidence,
    provider: "deterministic-fallback",
    fallback: true,
  };
}

function promptFor(item: CaseRecord) {
  const evidenceText = item.evidence.map((evidence) => `${evidence.id}: ${evidence.label} = ${evidence.value} [${evidence.status}] provenance=${evidence.provenance.source}/${evidence.provenance.contentHash}`).join("\n");
  return `Case ID: ${item.id}\nDeterministic route: ${item.decision}\nDeterministic risk score: ${item.signals.riskScore}\nMatch type: ${item.matchType}\nSource facts: amount=${item.transaction.amount}; date=${item.transaction.date}; description=${item.transaction.description}\nEvidence bundle:\n${evidenceText}\nExplain only the supplied case. The deterministic route and financial facts are authoritative. If proof is incomplete or contradictory, explain why it cannot be closed and cite only valid evidence IDs.`;
}

async function invokeOpenRouter(messages: Array<{ role: "system" | "user"; content: string }>) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://reconpilot-trust-layer.manus.space", "X-Title": "ReconPilot Trust Layer" },
    body: JSON.stringify({ model: "openrouter/auto", messages, response_format: RESPONSE_SCHEMA, temperature: 0.1 }),
  });
  if (!response.ok) return null;
  return response.json() as Promise<{ choices?: Array<{ message?: { content?: string } }> }>;
}

export async function explainCase(item: CaseRecord, requestedProvider: "gemini" | "openrouter" = "gemini"): Promise<BoundedAIResult> {
  const fallback = fallbackFor(item);
  const messages = [{ role: "system" as const, content: PROJECT_LOCK }, { role: "user" as const, content: promptFor(item) }];
  try {
    const response = requestedProvider === "openrouter"
      ? await invokeOpenRouter(messages)
      : await invokeLLM({ model: "gemini-3.1-pro-preview", messages, response_format: RESPONSE_SCHEMA });
    const raw = response?.choices?.[0]?.message?.content;
    const parsed = typeof raw === "string" ? JSON.parse(raw) as Omit<BoundedAIResult, "provider" | "fallback"> : null;
    if (!parsed || !Array.isArray(parsed.citedEvidence) || typeof parsed.reasoning !== "string") return fallback;
    const validEvidence = new Set(item.evidence.map((evidence) => evidence.id));
    const citedEvidence = parsed.citedEvidence.filter((id) => validEvidence.has(id));
    const safeClassification: Decision = item.decision === "refused" ? "refused" : parsed.classification === item.decision ? parsed.classification : "human_review";
    return { classification: safeClassification, confidence: Math.max(0, Math.min(1, parsed.confidence)), reasoning: parsed.reasoning, citedEvidence, provider: requestedProvider, fallback: false };
  } catch {
    return fallback;
  }
}

export function enforceAIBoundary(item: CaseRecord, output: BoundedAIResult) {
  return {
    ...output,
    classification: item.decision === "refused" ? "refused" : output.classification === item.decision ? output.classification : "human_review",
    citedEvidence: output.citedEvidence.filter((id) => item.evidence.some((evidence) => evidence.id === id)),
  };
}
