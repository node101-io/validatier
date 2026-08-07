import { runBlockLoop } from './blockLoop';

// Top-level orchestration. A single self-rescheduling recursive loop drives
// the block scan — no fixed-interval timers, no separate wall-clock poll for
// "daily jobs" (that trigger now lives inline in blockLoop.ts, driven by
// each processed block's own timestamp — see its file header). Each
// iteration only schedules the next one after the current one's await
// resolves, so overlapping iterations are structurally impossible.
//
// When caught up to the chain tip (heightsProcessed === 0), wait
// BLOCK_LOOP_INTERVAL_MS before checking again; when there's backlog to
// catch up on (fresh deploy, restart after downtime, a slow block), loop
// again immediately with no delay.

const BLOCK_LOOP_INTERVAL_MS = 10_000; // ~ cosmoshub block time (~6s), with margin

let stopped = false;
let pending: NodeJS.Timeout | null = null;
let inFlight: Promise<void> = Promise.resolve();

async function tick(): Promise<boolean> {
  let idle = true;
  try {
    const stats = await runBlockLoop();
    idle = stats.heightsProcessed === 0;
    if (!idle) {
      console.log(
        `block loop: heights ${stats.from}-${stats.to} (${stats.heightsProcessed} processed), ` +
          `${stats.transfersSeen} transfers, ${stats.validatorsCreated} validators created, ` +
          `${stats.withdrawOverridesApplied} withdraw overrides`
      );
    }
  } catch (err) {
    console.error('block loop tick failed (will retry):', err);
  }
  return idle;
}

async function loop(): Promise<void> {
  if (stopped) return;
  const p = tick();
  inFlight = p.then(() => {});
  const idle = await p;
  if (stopped) return;
  pending = setTimeout(() => void loop(), idle ? BLOCK_LOOP_INTERVAL_MS : 0);
}

export interface Scheduler {
  stop: () => Promise<void>;
}

export function startScheduler(): Scheduler {
  void loop();

  return {
    stop: async () => {
      stopped = true;
      if (pending) clearTimeout(pending);
      await inFlight; // let the current height (+ any inline daily job) finish cleanly
    },
  };
}
