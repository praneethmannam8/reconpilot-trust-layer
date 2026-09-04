# ReconPilot Full Roadmap

## Project lock

ReconPilot is an evidence-driven AI Finance Controller and Trust Layer, not a generic chatbot and not a replacement for reconciliation. Deterministic code owns all financial facts, matching outcomes, risk signals, routes, benchmark metrics, and audit hashes. AI is limited to explanation, classification, summarization, and review of supplied evidence. Incomplete, contradictory, or unverifiable proof must produce a structured refusal.

| Day | Focus | Deliverables | Exit gate |
|---|---|---|---|
| 1 | Foundation | Domain types, 64-record ground-truth fixture, validated CSV contract, audit payloads | Replay is deterministic; audit chain verifies |
| 2 | Deterministic controls | Matching strategies, risk rules, duplicate detection, missing-evidence detection, tests | No model is needed to establish facts or routes |
| 3 | Evidence and refusal | Evidence bundles, provenance, refusal states, exact next steps | Every case has a defensible evidence path |
| 4 | Bounded AI | Structured provider adapter, citation allowlist, route enforcement, deterministic fallback | AI cannot mutate facts or override a route |
| 5 | Console | Intake, run, route distribution, case register, evidence drawer, refusal and audit views | Judge can follow intake → evidence → audit |
| 6 | Measurement | Wall-clock throughput, ground-truth accuracy, route distribution, honest exceptions, exports | Methodology is visible and reproducible |
| 7 | Polish | README, five-minute demo, interview pack, architecture/security/product/visual review | Typecheck, tests, build, and visual QA pass |

## Specialist prompts

**Architecture:** Review the requested component against the project lock. Return boundaries, inputs, immutable outputs, evidence IDs, audit events, failure modes, tests, and one rejected-scope item. Never introduce autonomous financial decisions.

**Implementation:** Implement only the specified component. Keep facts immutable after intake. Use explicit schemas, deterministic replay, provenance, and tests. Treat provider output as untrusted until schema and citation validation complete.

**Testing:** Test normal, boundary, duplicate, mismatch, missing-evidence, replay, tampering, malformed CSV, provider failure, and adversarial model-output cases. Prove that model output cannot change facts, routes, metrics, or hashes.

**Documentation:** Explain the CSV schema, benchmark method, refusal semantics, audit verification, provider fallback, limitations, and the separation between deterministic facts and AI-generated explanation.

**Demo:** Improve the narrative without adding scope. Move from intake to controls, evidence, refused case, human next step, and hash-chain verification. Use skeptical language: evidence before opinion; yes with proof, no with reason, maybe with a human path.

## Non-goals

Do not add PDF parsing, mobile, Kubernetes, vector databases, autonomous payment actions, multi-tenancy, or complex orchestration frameworks to this buildathon MVP. Those features dilute the Trust Layer thesis.

## Acceptance criteria

The judge can identify the thesis within 30 seconds, run 60+ ground-truth records, inspect an exact match and a refusal, see exact missing evidence and next action, verify chained hashes, review benchmark methodology, and replay the deterministic pipeline with the same routes and facts.
