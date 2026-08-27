import { chainClient, ChainClient } from './client';

interface LcdValidatorsPage<T> {
  validators: T[];
  pagination?: { next_key: string | null };
}

// The current LCD provider (rest.cosmoshub-main.ccvalidators.com — see
// backend/.env's LCD_URL) rate-limits aggressively: measured 2026-08-27,
// even a single caller issuing back-to-back requests with no gap 429s
// intermittently, while 300-400ms between requests was reliable. This
// function is the single chokepoint for EVERY staking-validators LCD call
// in the app (daily job, weekly sync, and — the actual volume driver —
// archive/stakingIngest.ts's ~730-day backfill, which used to fire pages
// and successive days back-to-back with zero pacing of its own). One delay
// here, paid once per request, throttles all three uniformly.
const LCD_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Shared pagination over /cosmos/staking/v1beta1/validators — used both for
// the weekly full validator-metadata sync (ingest/validators.ts) and the
// daily bulk stake fetch (jobs/validatorStats.ts). `T` is left generic since
// each caller only needs a subset of the LCD validator object; the endpoint
// returns the full object regardless, so callers just type the fields they use.
// `client` defaults to the singleton and is only overridable so tests can
// point it at a local server (see chain/client.test.ts for the same pattern).
export async function fetchAllStakingValidators<T>(
  opts?: { height?: number; client?: ChainClient }
): Promise<T[]> {
  const client = opts?.client ?? chainClient;
  const out: T[] = [];
  let nextKey: string | null = null;
  do {
    const params = new URLSearchParams({ 'pagination.limit': '500' });
    if (nextKey) params.set('pagination.key', nextKey);
    const page = await client.lcdGet<LcdValidatorsPage<T>>(
      `/cosmos/staking/v1beta1/validators?${params.toString()}`,
      opts?.height !== undefined ? { height: opts.height } : undefined
    );
    out.push(...page.validators);
    const next = page.pagination?.next_key || null;
    if (next !== null && next === nextKey) {
      // Non-advancing next_key: a misbehaving node would spin forever otherwise.
      throw new Error(
        `staking validators pagination did not advance${
          opts?.height !== undefined ? ` at height ${opts.height}` : ''
        }`
      );
    }
    nextKey = next;
    await sleep(LCD_DELAY_MS);
  } while (nextKey);
  return out;
}
