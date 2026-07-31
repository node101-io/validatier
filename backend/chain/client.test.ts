import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { ChainClient, HttpError } from './client';

function serve(handler: http.RequestListener): Promise<{ url: string; close: () => void }> {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}

// getStatus/getBlock/getBlockResults now delegate to cosmjs's Comet38Client
// (transport + JSON-RPC envelope handling live there, already tested upstream).
// Only our own retry wrapper (rpcCall) and the still-custom LCD path are ours
// to test here; ChainClient(url, url) below stays as the constructor shape.

test('a persistent HTTP error preserves its status code after retries exhaust', async () => {
  const { url, close } = await serve((_req, res) => {
    res.writeHead(404).end('not found'); // fails on every attempt
  });
  try {
    const client = new ChainClient(url, url);
    await assert.rejects(
      () => client.lcdGet('/cosmos/staking/v1beta1/validators/x/delegations/y'),
      (err: unknown) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.status, 404); // callers rely on this to tell "not found" from "server broke"
        return true;
      }
    );
  } finally {
    close();
  }
});

test('lcdGet sends x-cosmos-block-height only when height is given', async () => {
  const seen: Array<string | undefined> = [];
  const { url, close } = await serve((req, res) => {
    seen.push(req.headers['x-cosmos-block-height'] as string | undefined);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
  try {
    const client = new ChainClient(url, url);
    await client.lcdGet('/x', { height: 12345 });
    await client.lcdGet('/x');
    assert.deepEqual(seen, ['12345', undefined]);
  } finally {
    close();
  }
});
