import { Price } from '../models/Price/Price';

// Daily ATOM/USD history (docs/03 `prices`, task 9.1). CoinGecko's
// market_chart endpoint returns one point per UTC day once `days` > 90
// (finer-grained otherwise) — verified live. The LAST point is "right now"
// for today (not midnight), so the upsert key is the CALENDAR DAY
// (day/month/year), not the raw timestamp: re-running later today updates
// today's row in place instead of creating a duplicate, and tomorrow's run
// naturally overwrites today's provisional value with a clean one once the
// day has fully closed.

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/coins/cosmos/market_chart';
const REQUEST_TIMEOUT_MS = 15_000;
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

async function fetchMarketChart(days: number): Promise<Array<[number, number]>> {
  const url = `${COINGECKO_URL}?vs_currency=usd&days=${days}`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const body = (await res.json()) as { prices: Array<[number, number]> };
      return body.prices;
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_ATTEMPTS) await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * attempt));
    }
  }
  throw new Error(`CoinGecko market_chart failed after ${RETRY_ATTEMPTS} attempts: ${lastError}`);
}

export interface PriceSyncStats {
  pointsReceived: number;
  daysSynced: number;
}

// days: how far back to fetch. First run should use a large window (e.g. 365)
// to backfill history; the daily scheduler (task 10.2) can use a small one
// (e.g. 2-3) since each day only needs its own point refreshed/added.
export async function syncPrices(days: number = 365): Promise<PriceSyncStats> {
  const points = await fetchMarketChart(days);

  // group by UTC calendar day; a Map preserves insertion order, and CoinGecko
  // returns points in chronological order, so the last write per key is the
  // most recent point for that day (today's live price beats its own day-open point).
  const byDay = new Map<string, { ms: number; price: number }>();
  for (const [ms, price] of points) {
    const d = new Date(ms);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    byDay.set(key, { ms, price });
  }

  const ops = [...byDay.values()].map(({ ms, price }) => {
    const d = new Date(ms);
    const day = d.getUTCDate();
    const month = d.getUTCMonth() + 1; // JS months are 0-11
    const year = d.getUTCFullYear();
    return {
      updateOne: {
        filter: { day, month, year },
        update: { $set: { timestamp: Math.floor(ms / 1000), day, month, year, price } },
        upsert: true,
      },
    };
  });

  if (ops.length > 0) {
    await Price.bulkWrite(ops, { ordered: false });
  }

  return { pointsReceived: points.length, daysSynced: ops.length };
}
