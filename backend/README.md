# Validatier Backend — Running It

Three independent processes. Read `CLAUDE.md` (repo root) first for the
architecture; this file is just the practical "how do I start this thing"
guide.

| Process | Command | What it does |
|---|---|---|
| Wrapper | `npm run archive-server` | Serves the local/R2 archive to the dashboard backend over plain HTTP (`ARCHIVE_URL`). |
| Ingester | `npm run archive-sync` | One-time backfill + ongoing tip-follow: walks the live chain (`RPC_URL`/`LCD_URL`), fills the archive. |
| Dashboard backend | `npm start` | The actual indexer (block loop, fund-flow engine, validator_stats). Talks ONLY to the wrapper, never to `RPC_URL`/`LCD_URL` directly. |

## Cold-start order (first run, or after `npm run wipe-db`)

**Do not start the ingester and the dashboard backend at the same time on
a fresh/wiped database.** Start them in this order:

1. `npm run archive-server` (wrapper) — always first, cheap, no chain
   access of its own.
2. `npm start` (dashboard backend) **alone** — wait for priming to finish
   (`priming: withdraw_map built...` in the log, a few minutes). Once
   `blockLoop` starts, it will just log 404s from the wrapper for
   everything (nothing archived yet) and idle — that's expected and
   harmless, it does NOT hit the live chain.
3. **Only after step 2 finishes priming**, start `npm run archive-sync`
   (ingester) in a separate terminal.

### Why this order matters

The dashboard backend's `chainClient` always talks to the wrapper — but
one specific call, `ingest/withdrawMap.ts`'s "what is this delegator's
CURRENT withdraw address" lookup, has no height and therefore no archived
answer to give it. The wrapper's `/lcd` handler (`archive/server.ts`)
deliberately falls through to a LIVE passthrough for any non-height LCD
call — see that file's comment. So during priming, the dashboard backend
*does* end up hitting the real `LCD_URL`, through the wrapper.

The ingester's staking backfill (`archive/stakingIngest.ts`) also hits the
same `LCD_URL` directly, and does so in a tight loop across ~730 days.

Measured 2026-08-27 against the current provider
(`rest.cosmoshub-main.ccvalidators.com`): it rate-limits far more
aggressively than the old public endpoint this code was originally tuned
for. Even a single caller sending requests back-to-back with no gap gets
intermittent 429s; two independent processes hitting it at the same time
(priming + backfill) reliably 429 each other out. `ingest/withdrawMap.ts`
and `chain/stakingValidators.ts` were both throttled (see their own
comments for the measured-safe delay), but throttling each process
*individually* doesn't help if the *combined* request rate from both at
once still exceeds what the provider allows — hence: don't run them
concurrently during this one-time cold start.

Once priming has finished, the dashboard backend goes quiet (blockLoop
just gets 404s from the wrapper until the ingester catches up to a given
height — a free, local, no-network response) and stops being a source of
LCD contention. From that point on, running the ingester and the
dashboard backend together is fine.

## If you see `HTTP 429 Too Many Requests`

- If it happened during `npm start`'s priming step while `archive-sync`
  was already running: stop `archive-sync`, restart `npm start` alone,
  let it finish, then restart `archive-sync`.
- If it keeps happening even with only one process running: the
  provider's rate limit may have gotten stricter, or something else on
  the network is sharing the same IP. Check `chain/stakingValidators.ts`
  and `ingest/withdrawMap.ts` for the current delay constants and
  re-measure (a quick sequential `curl` loop against the LCD host, same
  pattern used to derive the current values, is the fastest way to
  re-tune them).
