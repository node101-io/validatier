import http from 'http';
import { config } from '../config';
import { connectMongo, disconnectMongo } from '../db/mongo';
import { loadDashboard, loadMeta } from './dashboard';
import { isRangePreset, parseUntil, resolveRange } from './lib/dateRange';
import type { RangePreset, ResolvedRange } from './lib/dateRange';

// The HTTP API the frontend's server functions fetch from (frontend/src/lib/data.ts).
// A separate process from the indexer (backend/app.ts) — this only reads Mongo, it
// never writes, so it can restart/scale independently of the block loop.
//
// bech32 charset only — rejects obviously-invalid addresses before touching the
// (cached) dashboard snapshot at all.
const OPERATOR_ADDRESS_RE = /^cosmosvaloper1[a-z0-9]+$/;

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(payload);
}

// `?range=last_3_months|last_6_months|last_year|all_time` (default all_time)
// and `?until=YYYY-MM-DD` (default today) — every route resolves the same
// way so the whole dashboard windows consistently. Never errors on a bad
// value: missing/invalid range falls back to all_time, missing/invalid/
// out-of-bounds until falls back to today (see parseUntil), matching the
// "clamp, don't error" rule from the plan.
function parseRangeParams(url: URL): ResolvedRange {
  const rangeParam = url.searchParams.get('range');
  const preset: RangePreset = isRangePreset(rangeParam) ? rangeParam : 'all_time';
  const until = parseUntil(url.searchParams.get('until'));
  return resolveRange(preset, until);
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean); // e.g. ['api', 'validators', 'cosmosvaloper1...', 'summary']

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'method not allowed' });
    return;
  }

  if (parts[0] !== 'api') {
    sendJson(res, 404, { error: 'not found' });
    return;
  }

  // meta is range-independent and cheap (Meta singleton + latest price) —
  // answered without the full per-validator aggregation every other route
  // below needs (loadDashboard/computeDashboardForRange).
  if (parts.length === 2 && parts[1] === 'meta') {
    sendJson(res, 200, await loadMeta());
    return;
  }

  const range = parseRangeParams(url);
  const snapshot = await loadDashboard(range);

  if (parts.length === 2 && parts[1] === 'summary') {
    sendJson(res, 200, snapshot.summary);
    return;
  }

  if (parts.length === 2 && parts[1] === 'validators') {
    sendJson(res, 200, { validators: snapshot.validators });
    return;
  }

  if (parts.length === 4 && parts[1] === 'validators' && (parts[3] === 'summary' || parts[3] === 'series')) {
    const operatorAddress = decodeURIComponent(parts[2]!);
    if (!OPERATOR_ADDRESS_RE.test(operatorAddress)) {
      sendJson(res, 404, { error: 'validator not found' });
      return;
    }

    if (parts[3] === 'summary') {
      const summary = snapshot.summaryByOperator.get(operatorAddress);
      if (!summary) {
        sendJson(res, 404, { error: 'validator not found' });
        return;
      }
      sendJson(res, 200, summary);
      return;
    }

    // series: a validator with no row (excluded, total_withdraw == 0) simply
    // has no buckets — same "not found" as summary would give, but the
    // frontend only calls this after summary already succeeded, so an empty
    // array is the correct answer here rather than a second 404.
    sendJson(res, 200, snapshot.seriesByOperator.get(operatorAddress) ?? []);
    return;
  }

  sendJson(res, 404, { error: 'not found' });
}

async function main(): Promise<void> {
  // config.apiMongoUri === MONGO_URI unless API_MONGO_URI is set — lets this
  // read-only API serve a demo/copy DB while app.ts keeps writing to the live one.
  await connectMongo(config.apiMongoUri);

  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err: unknown) => {
      console.error('api: request failed', err);
      sendJson(res, 500, { error: 'internal error' });
    });
  });

  server.listen(config.apiPort, () => {
    console.log(`validatier api: listening on :${config.apiPort}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`${signal} received, shutting down api`);
    server.close();
    await disconnectMongo();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
