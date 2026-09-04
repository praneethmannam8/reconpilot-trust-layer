# ReconPilot Trust Layer

ReconPilot is an evidence-driven AI Finance Controller for the Razorpay AI Buildathon. It is a **Trust Layer** over reconciliation: it ingests records, matches them deterministically, identifies risk, assembles evidence, routes each case, refuses unsafe closures, and makes the result replayable through a chained audit trail.

> **AI boundary:** deterministic code owns financial facts, matching, risk signals, routes, benchmark metrics, and audit hashes. AI may explain, classify, summarize, or review supplied evidence. It cannot alter facts, override routes, invent citations, or perform irreversible actions.

## Run locally

```bash
pnpm install
pnpm check
pnpm test
pnpm build
pnpm dev
```

The app is a single full-stack React, tRPC, Express, and TypeScript project. The browser console is optimized for a desktop judge walkthrough but remains responsive on smaller screens.

## Workflow

The control-room flow is **intake → deterministic run → evidence → accountable route → audit verification**. The sample dataset contains 64 synthetic records with embedded ground truth. The pipeline reports accuracy, measured wall-clock throughput, route distribution, and an exception list without hiding non-approval cases.

## CSV contracts

The combined demo CSV requires `transaction_id`, `amount`, `date`, and `description`; it accepts `settlement_id`, `settlement_amount`, `settlement_date`, `settlement_reference`, `settlement_description`, and `ground_truth`. The interface validates amounts, dates, required descriptions, and ground-truth values before replacing the active dataset.

The deterministic engine also exposes separate-file contracts. A transactions file requires `transaction_id`, `amount`, `date`, and `description`. A settlements file requires `settlement_id`, `amount`, `date`, `reference`, and `description`. Missing or malformed columns are rejected with a precise row-level error; no financial fact is invented.

## Provider behavior

The server-side bounded AI adapter supports a live Gemini Pro route through the platform’s server helper and an optional OpenRouter-compatible route when `OPENROUTER_API_KEY` is configured. Both receive project-locked prompts, structured JSON output requirements, and provenance-aware evidence. Their responses are citation-filtered and route-enforced. If a provider is unavailable, malformed, rate-limited, or contradictory, ReconPilot returns a deterministic explanation instead.

OpenRouter and Gemini are never required for deterministic routing. The UI labels provider output as structured or fallback so reviewers can distinguish model assistance from source-of-truth controls.

## Audit integrity

Each audit entry stores its action, actor, payload, previous hash, and content hash. Verification starts at `GENESIS::RECONPILOT` and recomputes every link. A modified payload or broken previous-hash link fails the visible integrity status.

## Tests and limitations

Vitest covers deterministic replay, exact and non-exact outcomes, refusal behavior, audit tampering, benchmark metrics, CSV validation, AI citation filtering, and route protection. This MVP intentionally excludes PDF parsing, mobile, vector search, Kubernetes, multi-tenancy, autonomous payment actions, and real-time websockets. Those are outside the buildathon Trust Layer demonstration scope.

## API contract

The typed tRPC surface exposes `auth.me` and `auth.logout` for the template session, plus `ai.explain` for bounded explanation. `ai.explain` accepts a validated `CaseRecord` containing source transaction, optional settlement, deterministic match type and confidence, signals, route, evidence, provenance, and audit IDs, together with a provider choice of `gemini` or `openrouter`. It returns a structured classification, confidence, reasoning, cited evidence IDs, provider label, and fallback flag. The returned classification is never allowed to override the deterministic route.

The deterministic domain contract is implemented by `processRecords(transactions, settlements)`, `verifyAuditChain(audit)`, `parseReconCsv(csv)`, `parseTransactionsCsv(csv)`, `parseSettlementsCsv(csv)`, and `createReviewExport(result)`. These functions are pure or boundary-scoped and are the source of truth for facts, route outcomes, verification, intake validation, and reviewer exports.

## Audit storage boundary

The demo uses an append-only ledger abstraction within the single-process control plane. It rejects any append whose previous hash does not equal the current tip, returns cloned snapshots, and exposes the complete event schema to the audit UI and JSON export. A production deployment should back the same contract with a database or immutable object store with insert-only permissions; this MVP does not claim durable cross-instance persistence.
