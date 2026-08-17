import fs from 'fs';
import path from 'path';
import { FundFlowSinkRegistry } from '../models/FundFlowSinkRegistry/FundFlowSinkRegistry';
import { loadSinkRegistryRows, type SinkRow } from '../store/sinkRegistry';

// Loads the curated Tier 1 sink list (defined_accounts.csv, project root) into
// both stores: Mongo (persistent registry) and SQLite (hot-path lookup used
// by classification). Idempotent — safe to re-run.
//
// Business decisions baked in here (confirmed with the user):
//  - category=validator rows (a validator's OWN wallet) ARE included as Tier 1.
//  - confidence=medium rows (Range API sourced) are treated the same as high —
//    all rows become Tier 1 `realized` sinks. Confidence is kept only as a
//    label annotation for future manual review, it does not affect tier.

const CSV_PATH = path.resolve(__dirname, '..', '..', '..', 'defined_accounts.csv');

interface CsvRow {
  address: string;
  label: string;
  category: string;
  confidence: string;
  source: string;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const [, ...rows] = lines; // first line is the header
  return rows.map((line) => {
    const [address, label, category, confidence, source] = line.split(',');
    return { address, label, category, confidence, source };
  });
}

// category=exchange -> cex; category=validator -> validator (see docs/03 note
// on the FundFlowSinkRegistry kind enum). No 'dex' distinction in this source.
function toKind(category: string): 'cex' | 'validator' {
  return category === 'validator' ? 'validator' : 'cex';
}

function toLabel(row: CsvRow): string {
  return row.confidence === 'high' ? row.label : `${row.label} [conf:${row.confidence}]`;
}

export interface SinkRegistrySyncStats {
  total: number;
}

export async function syncSinkRegistryFromCsv(
  csvPath: string = CSV_PATH
): Promise<SinkRegistrySyncStats> {
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));

  await FundFlowSinkRegistry.bulkWrite(
    rows.map((row) => ({
      updateOne: {
        filter: { address: row.address },
        update: {
          $set: { tier: 1, kind: toKind(row.category), label: toLabel(row), source: 'static' },
          $setOnInsert: { discovered_at_height: null },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  const sqliteRows: SinkRow[] = rows.map((row) => ({
    address: row.address,
    tier: 1,
    kind: toKind(row.category),
  }));
  loadSinkRegistryRows(sqliteRows);

  return { total: rows.length };
}
