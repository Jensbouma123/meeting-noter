import { AbortError, HttpError, NetworkError, ParseError, TimeoutError, isApiError } from "./errors.js";
import { composeAbortSignals, isAbortError } from "./timeout.js";
import { backoffDelayMs, isRetryableError, isRetryableMethod, parseRetryAfterMs, resolveRetryOptions, sleep, } from "./retry.js";
import { logRequestFailure, logRequestStart, logRequestSuccess, resolveLogger } from "./logging.js";
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
                    onError === null || onError === void 0 ? void 0 : onError(apiError);
                    throw apiError;
                }
                const retryAfterMs = apiError.kind === "http" ? parseRetryAfterMs(apiError.retryAfter) : undefined;
                const delayMs = retryAfterMs !== null && retryAfterMs !== void 0 ? retryAfterMs : backoffDelayMs(attempt, retryOptions.baseDelayMs, retryOptions.maxDelayMs);
                attempt += 1;
                await sleep(delayMs, options.signal);
            }
        }
    }
    async function performRequest(method, url, body, options) {
        var _a, _b;
        const headers = mergeHeaders(defaultHeaders, options.headers, body);
        const composed = composeAbortSignals(options.signal, (_a = options.timeoutMs) !== null && _a !== void 0 ? _a : defaultTimeoutMs);
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
                const errorBody = await safeParseErrorBody(response);
                logRequestFailure(logger, ctx, durationMs, undefined, response.status);
                throw new HttpError(`Request failed with status ${response.status}`, response.status, response.statusText, url, errorBody, response.headers.get("retry-after"));
            }
            const parsed = await parseResponseBody(response, options.responseType);
            logRequestSuccess(logger, ctx, response.status, durationMs);
            return parsed;
        }
        catch (thrown) {
            if (isApiError(thrown))
                throw thrown;
            const durationMs = Date.now() - startedAt;
            if (isAbortError(thrown)) {
                const timeoutMs = (_b = options.timeoutMs) !== null && _b !== void 0 ? _b : defaultTimeoutMs;
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
function toApiError(error) {
    if (isApiError(error))
        return error;
    return new NetworkError("Unexpected error", error);
}
function mergeHeaders(defaultHeaders, requestHeaders, body) {
    const headers = new Headers(defaultHeaders);
    new Headers(requestHeaders).forEach((value, key) => headers.set(key, value));
    if (!headers.has("content-type") && isJsonBody(body)) {
        headers.set("content-type", "application/json");
    }
    return headers;
}
function isJsonBody(body) {
    if (body === undefined)
        return false;
    if (typeof FormData !== "undefined" && body instanceof FormData)
        return false;
    if (typeof Blob !== "undefined" && body instanceof Blob)
        return false;
    if (body instanceof URLSearchParams)
        return false;
    if (body instanceof ArrayBuffer)
        return false;
    if (typeof body === "string")
        return false;
    return true;
}
function encodeBody(body) {
    if (body === undefined)
        return undefined;
    if (typeof FormData !== "undefined" && body instanceof FormData)
        return body;
    if (typeof Blob !== "undefined" && body instanceof Blob)
        return body;
    if (body instanceof URLSearchParams)
        return body;
    if (body instanceof ArrayBuffer)
        return body;
    if (typeof body === "string")
        return body;
    return JSON.stringify(body);
}
async function parseResponseBody(response, responseType) {
    var _a;
    if (response.status === 204 || response.status === 205) {
        return undefined;
    }
    const contentType = (_a = response.headers.get("content-type")) !== null && _a !== void 0 ? _a : "";
    const kind = responseType !== null && responseType !== void 0 ? responseType : inferResponseKind(contentType);
    if (kind === "void")
        return undefined;
    if (kind === "json") {
        const text = await response.text();
        if (text.length === 0)
            return undefined;
        try {
            return JSON.parse(text);
        }
        catch (cause) {
            throw new ParseError("Failed to parse JSON response body", response.status, cause);
        }
    }
    if (kind === "text")
        return (await response.text());
    if (kind === "blob")
        return (await response.blob());
    if (kind === "arrayBuffer")
        return (await response.arrayBuffer());
    return (await response.formData());
}
function inferResponseKind(contentType) {
    if (contentType.includes("json"))
        return "json";
    if (contentType.startsWith("text/"))
        return "text";
    if (contentType === "")
        return "void";
    return "blob";
}
async function safeParseErrorBody(response) {
    var _a;
    try {
        const contentType = (_a = response.headers.get("content-type")) !== null && _a !== void 0 ? _a : "";
        if (contentType.includes("json")) {
            const text = await response.text();
            return text.length > 0 ? JSON.parse(text) : undefined;
        }
        if (contentType.startsWith("text/"))
            return await response.text();
        return undefined;
    }
    catch (_b) {
        return undefined;
    }
}
