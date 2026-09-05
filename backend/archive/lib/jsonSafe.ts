// cosmjs response objects contain Uint8Array (hashes, pubkeys, signatures)
// and occasionally bigint fields that JSON.stringify can't handle directly
// (Uint8Array serializes as {"0":1,"1":2,...}, bigint throws). Recursively
// converts both to JSON-safe forms before we persist anything to R2.
// Uint8Array -> base64 (compact, and nothing downstream needs to decode it
// back — the wrapper only ever reads plain fields like `header.time`).
export function toJsonSafe(value: unknown): unknown {
    if (value instanceof Uint8Array) {
        return Buffer.from(value).toString('base64');
    }
    if (typeof value === 'bigint') {
        return value.toString();
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value)) {
        return value.map(toJsonSafe);
    }
    if (value !== null && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = toJsonSafe(v);
        }
        return out;
    }
    return value;
}
