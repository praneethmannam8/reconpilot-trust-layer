import type { AuditEntry } from "./reconpilot";

const GENESIS = "GENESIS::RECONPILOT";

export class AppendOnlyAuditLedger {
  private readonly entries: AuditEntry[] = [];

  append(entry: AuditEntry) {
    const expectedPrevious = this.entries.at(-1)?.contentHash ?? GENESIS;
    if (entry.previousHash !== expectedPrevious) throw new Error("Audit append rejected: previous hash does not match the ledger tip.");
    this.entries.push(Object.freeze({ ...entry, evidenceHashes: [...entry.evidenceHashes] }));
    return entry;
  }

  snapshot(): AuditEntry[] {
    return this.entries.map((entry) => ({ ...entry, evidenceHashes: [...entry.evidenceHashes] }));
  }

  get length() { return this.entries.length; }
}
