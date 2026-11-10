const IDEMPOTENT_METHODS = new Set(["GET", "PUT", "DELETE"]);
export function isRetryableMethod(method) {
    return IDEMPOTENT_METHODS.has(method);
}
export function resolveRetryOptions(retry) {
    var _a, _b, _c;
    if (!retry)
        return undefined;
    const opts = retry === true ? {} : retry;
    const retries = (_a = opts.retries) !== null && _a !== void 0 ? _a : 3;
    if (retries <= 0)
        return undefined;
    return {
        retries,
        baseDelayMs: (_b = opts.baseDelayMs) !== null && _b !== void 0 ? _b : 200,
        maxDelayMs: (_c = opts.maxDelayMs) !== null && _c !== void 0 ? _c : 5000,
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
        if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
            reject(signal.reason);
            return;
        }
        const onAbort = () => {
            clearTimeout(timer);
            reject(signal === null || signal === void 0 ? void 0 : signal.reason);
        };
        const timer = setTimeout(() => {
            signal === null || signal === void 0 ? void 0 : signal.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        signal === null || signal === void 0 ? void 0 : signal.addEventListener("abort", onAbort, { once: true });
    });
}
