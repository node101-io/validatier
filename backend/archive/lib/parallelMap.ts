// Small worker-pool map — no queue library, just N workers pulling from a
// shared index counter. Used for the per-chunk block fetch: plan §1.5
// measured 63 blocks/sec at concurrency 48 against a single RPC endpoint,
// so this needs real concurrency, not a sequential loop like
// jobs/blockLoop.ts's live scan (which is sequential by design there,
// since it commits one SQLite transaction per height as it goes — the
// ingester has no such per-height transactional requirement, it only
// commits once per whole 1000-block chunk, after upload).
export async function parallelMap<T, R>(
    items: readonly T[],
    concurrency: number,
    fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let next = 0;
    async function worker(): Promise<void> {
        for (;;) {
            const i = next++;
            if (i >= items.length) return;
            out[i] = await fn(items[i], i);
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
    return out;
}
