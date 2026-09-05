// Strips a chainClient.getBlockResults() response down to what R2 actually
// needs to store (plan: docs/../.claude/plans/archive-node-...). Measured on
// real cosmoshub blocks: the dropped fields are ~73% of the raw bytes and
// none of them are ever read by parseBlockResults / parseValidatorLifecycleEvents
// (chain/blockResults.ts) — see strip.test.ts, which runs the SAME repo
// fixtures through both the untouched and the stripped shape and asserts the
// parser output is byte-for-byte identical. That test is the contract: if it
// ever fails, this list is wrong and must not go live.
//
// Dropped, and why (measured on cosmoshub block 12,000,003):
//  - `coin_spent` / `coin_received` events: a duplicate of `transfer` (same
//    sender/recipient/amount split across two paired events) — CLAUDE.md
//    gotcha #2 already says the parser must ignore these.
//  - `update_client` events: IBC light-client header updates. The `header`
//    attribute alone is tens of KB of another chain's consensus proof —
//    zero relation to a cosmoshub money movement.
//  - tx `log` / `data` / `info` fields: `log` is a JSON re-serialization of
//    the SAME tx's `events` array (SDK 0.45-era duplication); `data` is a
//    base64 protobuf msg response; `info` is unused ABCI metadata. None of
//    the three are read by the parser.
//
// Nothing else is touched — everything not listed here is kept as-is.

export const STRIPPED_EVENT_TYPES: ReadonlySet<string> = new Set([
    'coin_spent',
    'coin_received',
    'update_client',
]);

interface RawEvent {
    type: string;
    attributes?: Array<{ key: string; value?: string }>;
}

interface RawTxResult {
    code: number;
    events?: RawEvent[] | null;
    log?: string;
    data?: string;
    info?: string;
    [key: string]: unknown; // gas_wanted/gas_used etc. — passed through untouched
}

interface RawBlockResults {
    results?: RawTxResult[] | null;
    finalizeBlockEvents?: RawEvent[] | null;
    [key: string]: unknown; // height, validator_updates, consensus_param_updates, app_hash…
}

function stripEvents(events: RawEvent[] | null | undefined): RawEvent[] {
    return (events ?? []).filter((e) => !STRIPPED_EVENT_TYPES.has(e.type));
}

// Pure function: input is whatever chainClient.getBlockResults(height) or a
// JSON.parse of a stored object returns (both match the `unknown`-typed
// input parseBlockResults itself accepts — see chain/blockResults.ts).
export function stripBlockResults(raw: unknown): RawBlockResults {
    const br = raw as RawBlockResults;
    const { results, finalizeBlockEvents, ...rest } = br;

    const strippedResults =
        results == null
            ? results
            : results.map((tx) => {
                  const { log, data, info, events, ...restTx } = tx;
                  return { ...restTx, events: stripEvents(events) };
              });

    return {
        ...rest,
        results: strippedResults,
        finalizeBlockEvents:
            finalizeBlockEvents == null ? finalizeBlockEvents : stripEvents(finalizeBlockEvents),
    };
}
