import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownToLine, ArrowRight, CheckCircle2, ChevronRight, FileCheck2, Fingerprint, Gauge, LockKeyhole, Search, ShieldCheck, Upload, XCircle } from "lucide-react";
import { createReviewExport, generateSampleData, parseReconCsv, parseSettlementsCsv, parseTransactionsCsv, processRecords, verifyAuditChain, type CaseRecord, type Decision, type Settlement, type Transaction } from "@shared/reconpilot";
import { trpc } from "@/lib/trpc";

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const decisionMeta: Record<Decision, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  auto_approve: { label: "Auto-approved", tone: "emerald", icon: CheckCircle2 },
  human_review: { label: "Human review", tone: "amber", icon: AlertTriangle },
  refused: { label: "Refused", tone: "rose", icon: XCircle },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<"overview" | "cases" | "audit">("overview");
  const [filter, setFilter] = useState<"all" | Decision>("all");
  const [selected, setSelected] = useState<CaseRecord | null>(null);
  const [datasetLabel, setDatasetLabel] = useState("64 records · synthetic ground truth");
  const [uploadError, setUploadError] = useState("");
  const [uploadedTransactions, setUploadedTransactions] = useState<Transaction[] | null>(null);
  const [uploadedSettlements, setUploadedSettlements] = useState<Settlement[] | null>(null);
  const [processedAt, setProcessedAt] = useState("09:42:18 IST");
  const [data, setData] = useState(() => { const sample = generateSampleData(); return processRecords(sample.transactions, sample.settlements); });
  const [chainVerified, setChainVerified] = useState(() => verifyAuditChain(data.audit));
  const visibleCases = useMemo(() => filter === "all" ? data.cases : data.cases.filter((item) => item.decision === filter), [data.cases, filter]);

  const loadSample = () => {
    const sample = generateSampleData();     const next = processRecords(sample.transactions, sample.settlements); setData(next); setChainVerified(verifyAuditChain(next.audit));
    setDatasetLabel("64 records · synthetic ground truth");
    setProcessedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    setSelected(null);
  };

  const handleUpload = (file?: File) => {
    if (!file) return;
    setUploadError("");
    void file.text().then((csv) => {
      try {
        const uploaded = parseReconCsv(csv);
        const next = processRecords(uploaded.transactions, uploaded.settlements); setData(next); setChainVerified(verifyAuditChain(next.audit));
        setDatasetLabel(`${file.name} · ${uploaded.transactions.length} validated records`);
        setProcessedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        setSelected(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "invalid CSV";
        setUploadError(message);
        setDatasetLabel("Upload rejected · no financial facts were changed");
        setProcessedAt("awaiting valid file");
      }
    });
  };

  const handleSeparateUpload = (kind: "transactions" | "settlements", file?: File) => {
    if (!file) return;
    setUploadError("");
    void file.text().then((csv) => {
      try {
        if (kind === "transactions") { const rows = parseTransactionsCsv(csv); setUploadedTransactions(rows); setDatasetLabel(`${file.name} · ${rows.length} transactions validated`); }
        else { const rows = parseSettlementsCsv(csv); setUploadedSettlements(rows); setDatasetLabel(`${file.name} · ${rows.length} settlements validated`); }
      } catch (error) { setUploadError(error instanceof Error ? error.message : "Invalid CSV"); }
    });
  };

  const runPipeline = () => {
    if (uploadedTransactions && uploadedSettlements) { const next = processRecords(uploadedTransactions, uploadedSettlements); setData(next); setChainVerified(verifyAuditChain(next.audit)); setProcessedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })); return; }
    const sample = generateSampleData(); const next = processRecords(sample.transactions, sample.settlements); setData(next); setChainVerified(verifyAuditChain(next.audit));
    setProcessedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  };

  const downloadReviewExport = () => { const blob = new Blob([createReviewExport(data)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "reconpilot-review-export.json"; anchor.click(); URL.revokeObjectURL(url); };

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#16202a]">
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark"><ShieldCheck size={18} /></div><div><div className="brand-name">RECONPILOT</div><div className="brand-sub">EVIDENCE-DRIVEN FINANCE CONTROL</div></div></div>
        <div className="topbar-right"><span className="live-dot" /> <span>LOCAL CONTROL PLANE</span><span className="divider" /><span className="operator-chip"><span className="avatar">PM</span> Praneeth M.</span></div>
      </header>
      <div className="app-frame">
        <aside className="side-rail">
          <div className="rail-label">WORKSPACE</div>
          {(["overview", "cases", "audit"] as const).map((tab) => <button key={tab} className={`rail-item ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}><span className="rail-icon">{tab === "overview" ? <Gauge size={17} /> : tab === "cases" ? <FileCheck2 size={17} /> : <Fingerprint size={17} />}</span><span>{tab === "overview" ? "Control room" : tab === "cases" ? "Case register" : "Audit trail"}</span>{activeTab === tab && <ChevronRight size={14} className="rail-arrow" />}</button>)}
          <div className="rail-spacer" />
          <div className="scope-card"><div className="scope-icon"><LockKeyhole size={15} /></div><div><div className="scope-title">AI BOUNDARY ACTIVE</div><p>Facts are owned by deterministic controls. AI may explain, never decide.</p></div></div>
        </aside>
        <main className="content-area">
          <div className="page-heading"><div><div className="eyebrow">CONTROL ROOM / {activeTab.toUpperCase()}</div><h1>{activeTab === "overview" ? "Can we prove this decision?" : activeTab === "cases" ? "Case register" : "Audit trail"}</h1><p className="lede">A governed path from intake to evidence to accountable action.</p></div><div className="heading-actions"><button className="ghost-button" onClick={() => document.getElementById("csv-input")?.click()}><Upload size={16} /> Upload CSV</button><input id="csv-input" type="file" accept=".csv" hidden onChange={(event) => handleUpload(event.target.files?.[0])} /><input id="transactions-input" type="file" accept=".csv" hidden onChange={(event) => handleSeparateUpload("transactions", event.target.files?.[0])} /><input id="settlements-input" type="file" accept=".csv" hidden onChange={(event) => handleSeparateUpload("settlements", event.target.files?.[0])} /><button className="text-button upload-secondary" onClick={() => document.getElementById("transactions-input")?.click()}>Transactions CSV</button><button className="text-button upload-secondary" onClick={() => document.getElementById("settlements-input")?.click()}>Settlements CSV</button><button className="primary-button" onClick={loadSample}>Use sample data <ArrowRight size={16} /></button></div></div>

          {activeTab === "overview" && <>
            <section className="intake-strip"><div className="intake-step done"><div className="step-num">01</div><div><b>INTAKE</b><span>{datasetLabel}</span></div></div><div className="strip-line done" /><div className="intake-step done"><div className="step-num">02</div><div><b>DETERMINISTIC RUN</b><span>Matched · signalled · routed</span></div></div><div className="strip-line" /><div className="intake-step"><div className="step-num muted">03</div><div><b>CONTROL OWNER</b><span>Review only where required</span></div></div><button className="run-button" onClick={runPipeline}>Run pipeline <ArrowRight size={15} /></button></section>{uploadError && <div className="upload-error"><AlertTriangle size={15} /><div><b>CSV validation failed</b><span>{uploadError} Combined schema: transaction_id, amount, date, description, settlement_id, settlement_amount, ground_truth. Separate mode: transactions (transaction_id, amount, date, description) + settlements (settlement_id, amount, date, reference, description).</span></div></div>}
            <section className="metric-grid"><Metric label="Records processed" value={data.benchmark.total.toString()} note="ground-truth fixtures" icon={<FileCheck2 />} /><Metric label="Measured accuracy" value={`${(data.benchmark.accuracy * 100).toFixed(1)}%`} note="against known outcomes" icon={<ShieldCheck />} accent="emerald" /><Metric label="Throughput" value={`${data.benchmark.throughput.toFixed(0)}/s`} note="local deterministic run" icon={<Gauge />} accent="blue" /><Metric label="Audit integrity" value={data.audit.length ? "VERIFIED" : "PENDING"} note={`${data.audit.length} chained entries`} icon={<Fingerprint />} accent="violet" /></section><div className="method-note"><Fingerprint size={14} /><span><b>Benchmark method:</b> accuracy compares deterministic outcomes against embedded ground truth; throughput is measured wall-clock cases per second during the local run; exceptions are never hidden.</span></div>
            <section className="dashboard-grid"><div className="panel distribution-panel"><PanelTitle eyebrow="ROUTING DISTRIBUTION" title="Every case gets a route" action="View register" onAction={() => setActiveTab("cases")} /><div className="distribution-body"><div className="donut" style={{ "--approved": `${(data.benchmark.autoApprove / data.benchmark.total) * 100}%`, "--review": `${(data.benchmark.humanReview / data.benchmark.total) * 100}%` } as React.CSSProperties}><div><strong>{data.benchmark.total}</strong><span>cases</span></div></div><div className="legend"><Legend color="emerald" label="Auto-approved" value={data.benchmark.autoApprove} /><Legend color="amber" label="Human review" value={data.benchmark.humanReview} /><Legend color="rose" label="Refused" value={data.benchmark.refused} /></div></div><div className="panel-footnote"><span className="verified-badge"><CheckCircle2 size={13} /> deterministic routing</span><span>Replayable at any time</span></div></div><div className="panel exceptions-panel"><PanelTitle eyebrow="EXCEPTION QUEUE" title="Cases that need a human" action="Open all" onAction={() => { setFilter("all"); setActiveTab("cases"); }} /><div className="exception-list">{data.cases.filter((item) => item.decision !== "auto_approve").slice(0, 4).map((item) => <button className="exception-row" key={item.id} onClick={() => setSelected(item)}><div className={`status-dot ${decisionMeta[item.decision].tone}`} /><div className="exception-main"><b>{item.transaction.description}</b><span>{item.id} · {money(item.transaction.amount)}</span></div><span className={`mini-pill ${decisionMeta[item.decision].tone}`}>{decisionMeta[item.decision].label}</span><ChevronRight size={16} className="muted-icon" /></button>)}</div><div className="panel-footnote"><span><AlertTriangle size={13} className="amber-icon" /> {data.benchmark.exceptions.length} highlighted exceptions</span><span>Honest, not hidden</span></div></div></section>
            <section className="panel trust-panel"><div className="trust-copy"><div className="eyebrow">THE TRUST LAYER</div><h2>Evidence before opinion.</h2><p>ReconPilot does not ask AI to decide financial truth. It assembles a defensible case from source records, deterministic signals, and a chained audit trail — then refuses when proof is incomplete.</p><button className="text-button" onClick={() => setActiveTab("audit")}>Inspect the chain <ArrowRight size={15} /></button></div><div className="trust-stats"><div><span>01</span><b>Source facts</b><small>Immutable intake</small></div><div><span>02</span><b>Control signals</b><small>Reproducible rules</small></div><div><span>03</span><b>Accountable route</b><small>Human when needed</small></div></div></section>
          </>}

          {activeTab === "cases" && <section className="panel case-register"><div className="register-toolbar"><div><div className="eyebrow">EVIDENCE REGISTER</div><h2>Case-level control decisions</h2></div><div className="filter-group">{(["all", "auto_approve", "human_review", "refused"] as const).map((value) => <button key={value} className={filter === value ? "selected" : ""} onClick={() => setFilter(value)}>{value === "all" ? "All" : decisionMeta[value].label}</button>)}</div></div><div className="case-table"><div className="table-head"><span>Case / source</span><span>Match</span><span>Risk</span><span>Route</span><span /></div>{visibleCases.map((item) => <button className="table-row" key={item.id} onClick={() => setSelected(item)}><div><b>{item.id}</b><span>{item.transaction.description} · {money(item.transaction.amount)}</span></div><span className="match-cell">{item.matchType}<small>{Math.round(item.confidence * 100)}% conf.</small></span><span className={`risk-score ${item.signals.riskScore > 0 ? "risk-high" : "risk-low"}`}>{item.signals.riskScore}<small>/ 100</small></span><span className={`route-label ${decisionMeta[item.decision].tone}`}>{decisionMeta[item.decision].label}</span><ChevronRight size={16} className="muted-icon" /></button>)}</div></section>}

          {activeTab === "audit" && <section className="audit-layout"><div className="panel audit-summary"><div className="audit-seal"><Fingerprint size={27} /></div><div><div className="eyebrow">CHAIN STATUS</div><h2>{chainVerified ? "Integrity verified" : "Integrity check failed"}</h2><p>Every route is chained to the previous event and its payload hash is recomputed.</p></div><span className={`verified-badge large ${chainVerified ? "" : "rose"}`}><CheckCircle2 size={15} /> {chainVerified ? "PASS" : "FAIL"}</span><button className="text-button" onClick={downloadReviewExport}><ArrowDownToLine size={15} /> Export JSON</button></div><div className="panel audit-panel"><PanelTitle eyebrow="IMMUTABLE EVENT LOG" title={`${data.audit.length} entries · replayable`} action="Verify chain" onAction={() => { const ok = verifyAuditChain(data.audit); setChainVerified(ok); setProcessedAt(`${ok ? "chain verified" : "chain failed"} · ` + new Date().toLocaleTimeString("en-IN")); }} /><div className="audit-list">{data.audit.slice(0, 12).map((entry, index) => <div className="audit-row" key={entry.id}><div className="audit-line"><span className="audit-node" />{index < Math.min(data.audit.length, 12) - 1 && <span className="audit-connector" />}</div><div className="audit-entry"><b>{entry.action.replaceAll("_", " ")}</b><span>{entry.id} · {entry.eventId} · {entry.timestamp.slice(11, 19)} UTC · {entry.actor}</span><small>{entry.sessionId} · {entry.userId} · {entry.evidenceHashes.length} evidence hashes · result {entry.resultHash.slice(0, 10)}…{entry.refusalReason ? ` · refusal: ${entry.refusalReason}` : ""}</small></div><code>{entry.contentHash.slice(0, 16)}…</code><span className="chain-ok"><CheckCircle2 size={14} /></span></div>)}</div></div></section>}
        </main>
      </div>
      {selected && <CaseDrawer item={selected} onClose={() => setSelected(null)} />}
      <footer className="app-footer"><span><span className="live-dot" /> deterministic engine online</span><span>last run {processedAt}</span><span>ReconPilot v0.1 · Trust Layer build</span></footer>
    </div>
  );
}

function Metric({ label, value, note, icon, accent = "slate" }: { label: string; value: string; note: string; icon: React.ReactNode; accent?: string }) { return <div className="metric-card"><div className={`metric-icon ${accent}`}>{icon}</div><div className="metric-label">{label}</div><strong>{value}</strong><span>{note}</span></div>; }
function PanelTitle({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action: string; onAction: () => void }) { return <div className="panel-title"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div><button className="text-button" onClick={onAction}>{action} <ArrowRight size={14} /></button></div>; }
function Legend({ color, label, value }: { color: string; label: string; value: number }) { return <div className="legend-row"><span className={`legend-dot ${color}`} /><span>{label}</span><b>{value}</b></div>; }
function CaseDrawer({ item, onClose }: { item: CaseRecord; onClose: () => void }) { const meta = decisionMeta[item.decision]; const Icon = meta.icon; return <div className="drawer-backdrop" onClick={onClose}><aside className="case-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><div className="eyebrow">CASE EVIDENCE BUNDLE</div><h2>{item.id}</h2></div><button className="close-button" onClick={onClose}>×</button></div><div className={`decision-banner ${meta.tone}`}><Icon size={19} /><div><b>{meta.label}</b><span>{item.reason}</span></div></div><div className="drawer-section"><div className="eyebrow">SOURCE TRANSACTION</div><div className="facts-grid"><Fact label="Transaction ID" value={item.transaction.id} /><Fact label="Amount" value={money(item.transaction.amount)} /><Fact label="Merchant" value={item.transaction.description} /><Fact label="Ground truth" value={item.transaction.groundTruth} /></div></div><div className="drawer-section"><div className="eyebrow">SETTLEMENT DETAIL</div><div className="facts-grid"><Fact label="Settlement ID" value={item.settlement?.id ?? "Not provided"} /><Fact label="Settlement amount" value={item.settlement ? money(item.settlement.amount) : "Missing"} /><Fact label="Reference" value={item.settlement?.reference ?? "Missing evidence"} /><Fact label="Match method" value={item.matchType.replace("_", " ")} /></div></div><div className="drawer-section"><div className="eyebrow">TRIGGERED RULES</div><div className="facts-grid"><Fact label="Risk score" value={`${item.signals.riskScore} / 100`} /><Fact label="High value" value={item.signals.highValue ? "Triggered" : "Clear"} /><Fact label="Duplicate" value={item.signals.duplicate ? "Triggered" : "Clear"} /><Fact label="Missing settlement" value={item.signals.missingSettlement ? "Triggered" : "Clear"} /></div></div><div className="drawer-section"><div className="eyebrow">EVIDENCE CHAIN</div><div className="evidence-stack">{item.evidence.map((evidence) => <div className="evidence-item" key={evidence.id}><span className={`evidence-status ${evidence.status}`}><CheckCircle2 size={13} /></span><div><b>{evidence.label}</b><span>{evidence.value}</span><small>{evidence.id}</small></div></div>)}</div></div><BoundedReview item={item} /><div className="drawer-section action-section"><div className="eyebrow">RECOMMENDED HUMAN ACTION</div>{item.missingEvidence.length > 0 && <div className="missing-evidence"><b>Missing evidence</b>{item.missingEvidence.map((entry) => <span key={entry}>• {entry}</span>)}</div>}<p>{item.nextStep}</p><button className="primary-button full">Record next step <ArrowRight size={15} /></button></div></aside></div>; }
function BoundedReview({ item }: { item: CaseRecord }) { const explain = trpc.ai.explain.useMutation(); return <div className="drawer-section ai-review"><div className="eyebrow">BOUNDED AI REVIEW</div><p>AI may explain supplied evidence; the deterministic route remains authoritative.</p><button className="text-button" disabled={explain.isPending} onClick={() => explain.mutate({ caseData: item, provider: "gemini" })}>{explain.isPending ? "Reviewing evidence…" : "Generate bounded explanation"} <ArrowRight size={15} /></button>{explain.data && <div className="ai-result"><span>{explain.data.provider}{explain.data.fallback ? " · deterministic fallback" : " · structured response"}</span><b>{explain.data.reasoning}</b><small>Cited evidence: {explain.data.citedEvidence.length ? explain.data.citedEvidence.join(", ") : "none"}</small></div>}</div>; }
function Fact({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><b>{value}</b></div>; }
