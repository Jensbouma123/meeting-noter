const IDEMPOTENT_METHODS = new Set(["GET", "PUT", "DELETE"]);
export function isRetryableMethod(method) {
    return IDEMPOTENT_METHODS.has(method);
}
export function resolveRetryOptions(retry) {
    if (!retry)
        return undefined;
    const opts = retry === true ? {} : retry;
    const retries = opts.retries ?? 3;
    if (retries <= 0)
        return undefined;
    return {
        retries,
        baseDelayMs: opts.baseDelayMs ?? 200,
        maxDelayMs: opts.maxDelayMs ?? 5000,
    };
}
export function isRetryableError(error) {
    if (error.kind === "network")
        return true;
    if (error.kind === "http")
        return error.status === 429 || (error.status >= 500 && error.status <= 599);
    return false;
}
export function parseRetryAfterMs(headerValue) {
    if (!headerValue)
        return undefined;
    const seconds = Number(headerValue);
    if (!Number.isNaN(seconds))
        return Math.max(0, seconds * 1000);
    const dateMs = Date.parse(headerValue);
    if (!Number.isNaN(dateMs))
        return Math.max(0, dateMs - Date.now());
    return undefined;
}
/** Full-jitter exponential backoff: a random delay in [0, min(maxDelayMs, baseDelayMs * 2^attempt)]. */
export function backoffDelayMs(attempt, baseDelayMs, maxDelayMs) {
    const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
    return Math.random() * cap;
}
export function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(signal.reason);
            return;
        }
        const onAbort = () => {
            clearTimeout(timer);
            reject(signal?.reason);
        };
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}
