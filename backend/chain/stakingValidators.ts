import { chainClient, ChainClient } from './client';

interface LcdValidatorsPage<T> {
  validators: T[];
  pagination?: { next_key: string | null };
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
  } while (nextKey);
  return out;
}
