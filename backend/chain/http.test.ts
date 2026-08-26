import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retryAsync, HttpError } from './http';

test('retryAsync returns the first successful result without retrying', async () => {
    let calls = 0;
    const result = await retryAsync(async () => {
        calls++;
        return 'ok';
    });
    assert.equal(result, 'ok');
    assert.equal(calls, 1);
});

test('retryAsync retries on failure and succeeds once the function stops throwing', async () => {
    let calls = 0;
    const result = await retryAsync(
        async () => {
            calls++;
            if (calls < 3) throw new Error('transient');
            return 'recovered';
        },
        { attempts: 5, delayMs: () => 1 },
    );
    assert.equal(result, 'recovered');
    assert.equal(calls, 3);
});

test('retryAsync gives up after exhausting all attempts and wraps the last error', async () => {
    let calls = 0;
    await assert.rejects(
        () =>
            retryAsync(
                async () => {
                    calls++;
                    throw new Error('always fails');
                },
                { attempts: 3, delayMs: () => 1 },
            ),
        /3 attempts failed/,
    );
    assert.equal(calls, 3);
});

test('retryAsync preserves HttpError status code on the final thrown error', async () => {
    await assert.rejects(
        () =>
            retryAsync(
                async () => {
                    throw new HttpError(404, 'not found');
                },
                { attempts: 2, delayMs: () => 1 },
            ),
        (err: unknown) => {
            assert.ok(err instanceof HttpError);
            assert.equal(err.status, 404);
            return true;
        },
    );
});

test('retryAsync includes errorContext in the final thrown message', async () => {
    await assert.rejects(
        () =>
            retryAsync(
                async () => {
                    throw new Error('boom');
                },
                { attempts: 1, errorContext: 'my-operation' },
            ),
        /\(my-operation\)/,
    );
});

test('retryAsync passes the caught error into delayMs, letting callers vary backoff by error type', async () => {
    const seenErrors: unknown[] = [];
    let calls = 0;
    await assert.rejects(() =>
        retryAsync(
            async () => {
                calls++;
                throw new HttpError(calls === 1 ? 429 : 500, 'x');
            },
            {
                attempts: 3,
                delayMs: (attempt, err) => {
                    seenErrors.push(err);
                    return 1;
                },
            },
        ),
    );
    assert.equal(seenErrors.length, 2); // delayMs is called before attempts 2 and 3, not after the last
    assert.ok(seenErrors[0] instanceof HttpError && seenErrors[0].status === 429);
    assert.ok(seenErrors[1] instanceof HttpError && seenErrors[1].status === 500);
});

test('retryAsync attempts=1 means no retry at all', async () => {
    let calls = 0;
    await assert.rejects(() =>
        retryAsync(
            async () => {
                calls++;
                throw new Error('fail');
            },
            { attempts: 1 },
        ),
    );
    assert.equal(calls, 1);
});
