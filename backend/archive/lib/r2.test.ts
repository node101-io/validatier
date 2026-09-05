import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signV4 } from './r2';

// These only check signV4's structural/determinism properties (same input
// -> same signature, different input -> different signature, correct
// header shape). They do NOT verify against an AWS-published SigV4 test
// vector — this needs a live round-trip against the real R2 bucket once
// credentials exist (plan §8, §7 doğrulama item 5) before this code is
// trusted with real uploads.

const FIXED_DATE = new Date('2026-08-24T12:00:00.000Z');
const CREDS = { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'secret' };

test('signV4 is deterministic for identical inputs', () => {
    const a = signV4({
        method: 'PUT',
        host: 'acct.r2.cloudflarestorage.com',
        path: '/bucket/key',
        body: Buffer.from('hello'),
        date: FIXED_DATE,
        ...CREDS,
    });
    const b = signV4({
        method: 'PUT',
        host: 'acct.r2.cloudflarestorage.com',
        path: '/bucket/key',
        body: Buffer.from('hello'),
        date: FIXED_DATE,
        ...CREDS,
    });
    assert.equal(a.headers.authorization, b.headers.authorization);
});

test('signV4 authorization header has the expected AWS4-HMAC-SHA256 shape', () => {
    const { headers } = signV4({
        method: 'GET',
        host: 'acct.r2.cloudflarestorage.com',
        path: '/bucket/key',
        body: Buffer.alloc(0),
        date: FIXED_DATE,
        ...CREDS,
    });
    assert.match(
        headers.authorization,
        /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/20260824\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/,
    );
    assert.equal(headers['x-amz-date'], '20260824T120000Z');
    assert.equal(headers.host, 'acct.r2.cloudflarestorage.com');
});

test('a different body changes the payload hash and the signature', () => {
    const base = {
        method: 'PUT' as const,
        host: 'acct.r2.cloudflarestorage.com',
        path: '/bucket/key',
        date: FIXED_DATE,
        ...CREDS,
    };
    const a = signV4({ ...base, body: Buffer.from('one') });
    const b = signV4({ ...base, body: Buffer.from('two') });
    assert.notEqual(a.headers['x-amz-content-sha256'], b.headers['x-amz-content-sha256']);
    assert.notEqual(a.headers.authorization, b.headers.authorization);
});

test('an empty body hashes to the well-known SHA-256("") constant', () => {
    const { headers } = signV4({
        method: 'GET',
        host: 'acct.r2.cloudflarestorage.com',
        path: '/bucket/key',
        body: Buffer.alloc(0),
        date: FIXED_DATE,
        ...CREDS,
    });
    assert.equal(
        headers['x-amz-content-sha256'],
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
});
