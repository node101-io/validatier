import { uatomToAtom } from './amounts';
import { valueAtOrBefore, type TimedValue } from './lookup';

// Mirrors one Mongo `validator_stats` doc (docs/03) — fixed length-31 arrays,
// index = day-1, unset days are null.
export interface ValidatorStatsMonthDoc {
  year: number;
  month: number;
  timestamp: ReadonlyArray<number | null>;
  total_stake: ReadonlyArray<string | null>;
  total_withdrawn_reward: ReadonlyArray<string | null>;
  total_withdrawn_commission: ReadonlyArray<string | null>;
}

export interface MonthlyBucket {
  year: number;
  month: number;
  data: {
    timestamp: Array<number | null>;
    total_stake: Array<number | null>;
    total_sold: Array<number | null>;
    price: Array<number | null>;
  };
}

export interface PopulatedDay {
  timestamp: number;
  total_stake: string | null;
  total_withdrawn_reward: string | null;
  total_withdrawn_commission: string | null;
}

// Flattens the month-bucketed docs into one row per actually-populated day,
// chronological — the all_time equivalent of viz/data.py's
// _flatten_validator_stats, used by aggregate.ts to find "the latest day" and
// "every stake sample" without re-walking the 31-slot arrays each time.
export function flattenPopulatedDays(docs: ReadonlyArray<ValidatorStatsMonthDoc>): PopulatedDay[] {
  const rows: PopulatedDay[] = [];
  for (const doc of docs) {
    for (let i = 0; i < doc.timestamp.length; i++) {
      const ts = doc.timestamp[i];
      if (ts === null || ts === undefined) continue;
      rows.push({
        timestamp: ts,
        total_stake: doc.total_stake[i] ?? null,
        total_withdrawn_reward: doc.total_withdrawn_reward[i] ?? null,
        total_withdrawn_commission: doc.total_withdrawn_commission[i] ?? null,
      });
    }
  }
  rows.sort((a, b) => a.timestamp - b.timestamp);
  return rows;
}

// Builds one export MonthlyBucket from a raw validator_stats doc, filling
// total_sold/price by looking up this validator's own cumulative-sold and the
// network price series as-of each populated day (docs/05 MonthlyBucket).
export function buildMonthlyBucket(
  doc: ValidatorStatsMonthDoc,
  decimals: number,
  cumulativeSoldTimeline: ReadonlyArray<TimedValue<bigint>>,
  priceTimeline: ReadonlyArray<TimedValue<number>>
): MonthlyBucket {
  const len = doc.timestamp.length;
  const timestamp: Array<number | null> = new Array(len).fill(null);
  const total_stake: Array<number | null> = new Array(len).fill(null);
  const total_sold: Array<number | null> = new Array(len).fill(null);
  const price: Array<number | null> = new Array(len).fill(null);

  for (let i = 0; i < len; i++) {
    const ts = doc.timestamp[i];
    if (ts === null || ts === undefined) continue;

    timestamp[i] = ts;
    total_stake[i] = uatomToAtom(doc.total_stake[i], decimals);

    const soldAsOfDay = valueAtOrBefore(cumulativeSoldTimeline, ts);
    total_sold[i] = soldAsOfDay === null ? 0 : uatomToAtom(soldAsOfDay, decimals);

    price[i] = valueAtOrBefore(priceTimeline, ts);
  }

  return { year: doc.year, month: doc.month, data: { timestamp, total_stake, total_sold, price } };
}
