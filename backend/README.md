# Validatier Backend — Running It

Three independent processes. Read `CLAUDE.md` (repo root) first for the
architecture; this file is just the practical "how do I start this thing"
guide.

| Process | Command | What it does |
|---|---|---|
| Wrapper | `npm run archive-server` | Serves the local/R2 archive to the dashboard backend over plain HTTP (`ARCHIVE_URL`). |
| Ingester | `npm run archive-sync` | One-time backfill + ongoing tip-follow: walks the live chain (`RPC_URL`/`LCD_URL`), fills the archive. |
| Dashboard backend | `npm start` | The actual indexer (block loop, fund-flow engine, validator_stats). Talks ONLY to the wrapper, never to `RPC_URL`/`LCD_URL` directly. |
| HTTP API | `npm run api` | Read-only HTTP API the frontend fetches from (`backend/api/server.ts`). Only reads Mongo, never writes — restarts/scales independently of the indexer. |

## Pointing the HTTP API at a different database (demos)

The new frontend never touches Mongo — it only fetches from `npm run api`
(`BACKEND_API_URL` in `frontend/.env`). So "run the demo against the old
DB" means "point the HTTP API at that DB", not the frontend.

Set `API_MONGO_URI` in `.env` (or inline). It is read **only** by
`backend/api/server.ts`; when unset it falls back to `MONGO_URI`, so
existing setups are unchanged. Nothing else is affected:

- `npm start` (indexer) keeps writing to `MONGO_URI`.
- `npm run archive-sync` (ingester) never touches Mongo at all.

Recipe for a demo alongside the live stack:

```bash
# a second API process on its own port, reading a copy/old DB
API_MONGO_URI='mongodb://.../validatier-demo' API_PORT=4001 npm run api

# frontend/.env
BACKEND_API_URL=http://localhost:4001
```

The API's startup log line (`mongo: connected (db=...)`) names the DB it
actually connected to — check it. Remove `API_MONGO_URI` to go back to
`MONGO_URI`.

Schema caveat: `backend/api` expects the current collections
(`validators`, `validator_stats`, `fund_flow_edges`, `validator_sink_sales`,
`fund_flow_sink_registry`, `prices`, `meta`). A pre-rewrite database won't
serve — this only works with a database that already has the new schema.

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
