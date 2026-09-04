# ReconPilot Demo and Interview Pack

## Five-minute demo

| Segment | Time | Action | Message |
|---|---:|---|---|
| Problem | 0:00–0:30 | Show overview | “Efficiency without trust is dangerous. ReconPilot asks: can we prove this decision?” |
| Intake | 0:30–1:00 | Use sample data or upload CSV | “The 64 records carry ground truth. Intake validates facts before any model sees them.” |
| Process | 1:00–1:45 | Run pipeline | “Matching, rules, routing, and metrics are deterministic. AI is not the judge.” |
| Evidence | 1:45–2:45 | Open exception case | Show transaction, settlement, match type, triggered rules, provenance, route, and human action. |
| Refusal | 2:45–3:45 | Open refused case | “The system names the missing or contradictory evidence and refuses to guess.” |
| Audit | 3:45–4:30 | Verify chain | “Every event links to the prior hash; verification recomputes the chain.” |
| Close | 4:30–5:00 | Return to Trust Layer panel | “Yes with proof, no with reason, maybe with an accountable human path.” |

## Interview answers

**Why is this a Trust Layer?** Reconciliation finds relationships. ReconPilot governs whether those relationships are sufficiently evidenced to close, how exceptions are routed, and whether the decision can be replayed.

**What can AI do?** Explain, classify, summarize, and review supplied evidence. It cannot alter amounts, IDs, dates, settlement facts, matching, risk, routes, metrics, or hashes.

**How is hallucination controlled?** Project-locked prompts, structured output, evidence-ID allowlists, citation filtering, deterministic route enforcement, and a fallback that uses only deterministic facts.

**Why refuse?** A finance controller must be explicit when proof is incomplete. Refusal is safer than a confident guess when the source evidence cannot support closure.

**How does the hash chain work?** Each event stores a payload, previous hash, and content hash. Verification recomputes every link from the genesis value and fails if a payload or link changes.

**How is accuracy measured?** Deterministic outcomes are compared with embedded ground truth. The console reports accuracy, route distribution, measured wall-clock throughput, and an honest exception list.

**Why a single-container MVP?** The buildathon target is small and inspectable. Domain logic, UI, and provider adapter are separated so storage or deployment can evolve without changing the trust boundary.

**How would Razorpay integrate it?** As a sidecar control plane over authorized settlement and ledger exports. It adds governance and auditability without replacing the reconciliation engine.

**What comes next?** Append-only persistence, role-based review actions, separate source feeds, policy evidence, and operational monitoring—without changing deterministic ownership.

## Judge checklist

The judge should identify the thesis in 30 seconds, process 60+ records, inspect a match and a refusal, see exact missing evidence and a next step, verify the audit chain, understand the AI boundary, and replay the run.

## Additional interview questions

**Why not let the model choose the best match?** Matching is a financial fact derived from source records. Letting a model choose it would make replay and accountability impossible. The model can comment on a deterministic match, never create one.

**What happens when a provider is unavailable?** The case remains governed by the deterministic result. The adapter returns a labeled fallback explanation using only known facts, so provider availability never changes financial routing.

**How do you prevent unsupported citations?** The response is filtered against the case’s evidence-ID allowlist. Unknown citation IDs are removed, and an output with unusable evidence is treated as invalid.

**What is the most important security property?** No untrusted model output can mutate source facts or authorize an irreversible action. The route is enforced after model output, not accepted from it.

**Why show ground truth in the demo?** It makes the benchmark inspectable. The judge can compare outcomes with known synthetic labels rather than accepting an unexplained accuracy claim.

**How do you keep the experience premium rather than noisy?** The interface uses a restrained institutional palette, a single evidence-first narrative spine, compact technical metadata, and stronger color only for verified proof or exceptions.

**What should a finance operator do with a refusal?** Follow the exact next step, attach or resolve the named evidence, then replay the case. The system does not silently convert a refusal into approval.
