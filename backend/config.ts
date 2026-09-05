import path from 'path';
import dotenv from 'dotenv';

// .env lives at the package root (next to package.json). __dirname is dist/
// after compilation, so resolve one level up — independent of the cwd the
// process was started from.
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

export interface Config {
  denom: string;
  decimals: number;
  bech32Prefix: string;
  rpcUrl: string; // CometBFT RPC (/status, /block, /block_results) — used only by the
  // archive ingester (backend/archive/ingest.ts), which talks to the live chain directly.
  lcdUrl: string; // Cosmos REST (/cosmos/...) — same, ingester-only.
  archiveUrl: string; // archive wrapper (backend/archive/server.ts) — what chain/client.ts's
  // `chainClient` singleton actually calls; the running dashboard backend never touches
  // rpcUrl/lcdUrl above.
  mongoUri: string;
  apiMongoUri: string; // backend/api/server.ts only — lets the read-only HTTP API serve a
  // different DB (e.g. a demo/copy) while the indexer (app.ts) keeps writing to mongoUri.
  // Falls back to mongoUri when API_MONGO_URI is unset.
  sqlitePath: string;
  maxDepth: number;
  tier2MinIndegree: number;
  backfillLookbackDays: number;
  apiPort: number; // backend/api/server.ts — the dashboard HTTP API frontend reads from
}

// Every var is required: a misconfigured indexer must die at startup, not
// silently produce wrong data with a fallback value.
function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name} (see .env.example)`);
  }
  return value;
}

function requireInt(name: string): number {
  const raw = requireEnv(name);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Env var ${name} must be a non-negative integer, got "${raw}"`);
  }
  return value;
}

function requireUrl(name: string): string {
  const value = requireEnv(name);
  if (!/^https?:\/\//.test(value)) {
    throw new Error(`Env var ${name} must be an http(s) URL, got "${value}"`);
  }
  return value.replace(/\/+$/, ''); // no trailing slash — paths are appended as-is
}

export const config: Config = {
  denom: requireEnv('DENOM'),
  decimals: requireInt('DECIMALS'),
  bech32Prefix: requireEnv('BECH32_PREFIX'),
  rpcUrl: requireUrl('RPC_URL'),
  lcdUrl: requireUrl('LCD_URL'),
  archiveUrl: requireUrl('ARCHIVE_URL'),
  mongoUri: requireEnv('MONGO_URI'),
  apiMongoUri: process.env.API_MONGO_URI?.trim() || requireEnv('MONGO_URI'),
  sqlitePath: requireEnv('SQLITE_PATH'),
  maxDepth: requireInt('MAX_DEPTH'),
  tier2MinIndegree: requireInt('TIER2_MIN_INDEGREE'),
  backfillLookbackDays: requireInt('BACKFILL_LOOKBACK_DAYS'),
  apiPort: requireInt('API_PORT'),
};
