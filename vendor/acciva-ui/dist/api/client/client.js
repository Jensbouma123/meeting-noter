import { AbortError, HttpError, NetworkError, TimeoutError, isApiError } from "../errors.js";
import { composeAbortSignals, isAbortError } from "../timeout.js";
import { backoffDelayMs, isRetryableError, isRetryableMethod, parseRetryAfterMs, resolveRetryOptions, sleep, } from "../retry.js";
import { logRequestFailure, logRequestStart, logRequestSuccess, resolveLogger } from "../logging.js";
import { encodeBody, mergeHeaders } from "./body.js";
import { parseResponseBody, safeParseErrorBody } from "./response.js";
import { toApiError } from "./to-api-error.js";
const DEFAULT_TIMEOUT_MS = 30000;
export function createApiClient(config) {
    const { baseUrl, headers: defaultHeaders, timeoutMs: defaultTimeoutMs = DEFAULT_TIMEOUT_MS, fetch: fetchImpl = globalThis.fetch, logger: providedLogger, onError, } = config;
    if (!fetchImpl) {
        throw new Error("createApiClient: no fetch implementation available; pass `fetch` explicitly");
    }
    const logger = resolveLogger(providedLogger);
    async function request(method, path, body, options = {}) {
        const url = new URL(path, baseUrl).toString();
        const retryOptions = isRetryableMethod(method) ? resolveRetryOptions(options.retry) : undefined;
        let attempt = 0;
        for (;;) {
            try {
                return await performRequest(method, url, body, options);
            }
            catch (thrown) {
                const apiError = toApiError(thrown);
                const canRetry = retryOptions !== undefined && attempt < retryOptions.retries && isRetryableError(apiError);
                if (!canRetry) {
                    onError?.(apiError);
                    throw apiError;
                }
                const retryAfterMs = apiError.kind === "http" ? parseRetryAfterMs(apiError.retryAfter) : undefined;
                const delayMs = retryAfterMs ?? backoffDelayMs(attempt, retryOptions.baseDelayMs, retryOptions.maxDelayMs);
                attempt += 1;
                try {
                    await sleep(delayMs, options.signal);
                }
                catch (sleepError) {
                    const abortError = options.signal?.aborted
                        ? new AbortError("Request was aborted")
                        : toApiError(sleepError);
                    onError?.(abortError);
                    throw abortError;
                }
            }
        }
    }
    async function performRequest(method, url, body, options) {
        const headers = mergeHeaders(defaultHeaders, options.headers, body);
        const composed = composeAbortSignals(options.signal, options.timeoutMs ?? defaultTimeoutMs);
        const ctx = { method, url, headers: options.headers };
        const startedAt = Date.now();
        logRequestStart(logger, ctx, body, options.logBody);
        try {
            const response = await fetchImpl(url, {
                method,
                headers,
                body: encodeBody(body),
                signal: composed.signal,
            });
            const durationMs = Date.now() - startedAt;
            if (!response.ok) {
                const httpError = new HttpError(`Request failed with status ${response.status}`, response.status, response.statusText, url, await safeParseErrorBody(response), response.headers.get("retry-after"));
                logRequestFailure(logger, ctx, durationMs, httpError, response.status);
                throw httpError;
            }
            const parsed = await parseResponseBody(response, options.responseType);
            logRequestSuccess(logger, ctx, response.status, durationMs);
            return parsed;
        }
        catch (thrown) {
            if (isApiError(thrown)) {
                if (thrown.kind === "parse")
                    logRequestFailure(logger, ctx, Date.now() - startedAt, thrown);
                throw thrown;
            }
            const durationMs = Date.now() - startedAt;
            if (composed.didTimeout() || isAbortError(thrown) || composed.signal.aborted) {
                const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
                const nextError = composed.didTimeout()
                    ? new TimeoutError(`Request timed out after ${timeoutMs}ms`, timeoutMs)
                    : new AbortError("Request was aborted");
                logRequestFailure(logger, ctx, durationMs, nextError);
                throw nextError;
            }
            const networkError = new NetworkError("Network request failed", thrown);
            logRequestFailure(logger, ctx, durationMs, networkError);
            throw networkError;
        }
        finally {
            composed.cleanup();
        }
    }
    return {
        get: (path, options) => request("GET", path, undefined, options),
        post: (path, body, options) => request("POST", path, body, options),
        put: (path, body, options) => request("PUT", path, body, options),
        patch: (path, body, options) => request("PATCH", path, body, options),
        delete: (path, options) => request("DELETE", path, undefined, options),
    };
}
