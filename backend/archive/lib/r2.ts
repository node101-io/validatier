import crypto from 'node:crypto';

// Minimal S3-compatible client for Cloudflare R2 (AWS SigV4), hand-rolled
// with node:crypto instead of pulling in the AWS SDK or a signing library —
// R2's bucket is small (~23-28 GB, plan §1.3) and we only need PUT/GET on
// single objects, not multipart upload or listing. Signing (`signV4`) is
// kept pure/exported so it's unit-testable without a live bucket — see
// r2.test.ts. The network calls (putObject/getObject) were verified
// against a real bucket (2026-08-25 smoke test) — see the plan's §7
// doğrulama log; not covered by the automated test suite itself.
//
// Nothing outside archive/localArchive.ts should call these directly — R2
// is the BACKUP, not the primary store (lead dev's call, 2026-08-25; see
// localArchive.ts's header). This file only knows how to talk to R2, it
// has no opinion on when that's the right thing to do.

export interface R2Config {
    accountId: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
}

const REGION = 'auto';
const SERVICE = 's3';

function hmac(key: Buffer | string, data: string): Buffer {
    return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: Buffer | string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

// AWS Signature Version 4, single-chunk (non-streaming) signing — the
// canonical algorithm from
// https://docs.aws.amazon.com/general/latest/gr/sigv4-signed-request.html,
// specialized to what R2's S3-compatible endpoint needs: no query-string
// signing (we never presign URLs), a fixed header set.
export function signV4({
    method,
    host,
    path,
    body,
    accessKeyId,
    secretAccessKey,
    date = new Date(),
}: {
    method: 'GET' | 'PUT';
    host: string;
    path: string; // must start with '/', already percent-encoded per-segment
    body: Buffer;
    accessKeyId: string;
    secretAccessKey: string;
    date?: Date;
}): { headers: Record<string, string> } {
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256Hex(body);

    const canonicalHeaders =
        `host:${host}\n` + `x-amz-content-sha256:${payloadHash}\n` + `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
        method,
        path,
        '', // no query string
        canonicalHeaders,
        signedHeaders,
        payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        sha256Hex(canonicalRequest),
    ].join('\n');

    const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = hmac(kDate, REGION);
    const kService = hmac(kRegion, SERVICE);
    const kSigning = hmac(kService, 'aws4_request');
    const signature = hmac(kSigning, stringToSign).toString('hex');

    const authorization =
        `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
        headers: {
            host,
            'x-amz-content-sha256': payloadHash,
            'x-amz-date': amzDate,
            authorization,
        },
    };
}

function endpoint(cfg: R2Config, key: string): { host: string; url: string; path: string } {
    const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
    const path = `/${cfg.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
    return { host, path, url: `https://${host}${path}` };
}

export async function putObject(
    cfg: R2Config,
    key: string,
    body: Buffer,
    contentType = 'application/octet-stream',
): Promise<void> {
    const { host, path, url } = endpoint(cfg, key);
    const { headers } = signV4({
        method: 'PUT',
        host,
        path,
        body,
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
    });
    const res = await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'content-type': contentType, 'content-length': String(body.length) },
        body,
    });
    if (!res.ok) {
        throw new Error(`R2 PUT ${key} failed: ${res.status} ${res.statusText} ${await res.text()}`);
    }
}

// Returns null on a 404 (object doesn't exist yet — a normal, expected
// state for e.g. a not-yet-written manifest.json), throws on anything else.
export async function getObject(cfg: R2Config, key: string): Promise<Buffer | null> {
    const { host, path, url } = endpoint(cfg, key);
    const { headers } = signV4({
        method: 'GET',
        host,
        path,
        body: Buffer.alloc(0),
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
    });
    const res = await fetch(url, { method: 'GET', headers });
    if (res.status === 404) return null;
    if (!res.ok) {
        throw new Error(`R2 GET ${key} failed: ${res.status} ${res.statusText} ${await res.text()}`);
    }
    return Buffer.from(await res.arrayBuffer());
}
