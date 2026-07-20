import type { Statement } from 'better-sqlite3';
import { getSqlite } from '../db/sqlite';

// SQLite sink_registry primitives (docs/04): the hot-path lookup used by
// classification. Loaded from Mongo fund_flow_sink_registry at startup.

export interface SinkRow {
  address: string;
  tier: 1 | 2;
  kind: string;
}

let upsertStmt: Statement | null = null;
let lookupStmt: Statement | null = null;

export function upsertSinkRegistryRow(row: SinkRow): void {
  if (!upsertStmt) {
    upsertStmt = getSqlite().prepare(
      'INSERT OR REPLACE INTO sink_registry (address, tier, kind) VALUES (?, ?, ?)'
    );
  }
  upsertStmt.run(row.address, row.tier, row.kind);
}

export function loadSinkRegistryRows(rows: readonly SinkRow[]): void {
  for (const row of rows) upsertSinkRegistryRow(row);
}

export function lookupSink(address: string): { tier: number; kind: string } | null {
  if (!lookupStmt) {
    lookupStmt = getSqlite().prepare('SELECT tier, kind FROM sink_registry WHERE address = ?');
  }
  const row = lookupStmt.get(address) as { tier: bigint | number; kind: string } | undefined;
  return row ? { tier: Number(row.tier), kind: row.kind } : null;
}
