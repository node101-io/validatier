import http from 'http';
import { config } from '../config';
import { connectMongo, disconnectMongo } from '../db/mongo';
import { loadDashboard } from './dashboard';

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

  const snapshot = await loadDashboard();

  if (parts.length === 2 && parts[1] === 'meta') {
    sendJson(res, 200, snapshot.meta);
    return;
  }

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
  await connectMongo();

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
