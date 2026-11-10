import type { ApiError } from "./errors.js";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
export type RequestBody = JsonValue | FormData | Blob | ArrayBuffer | URLSearchParams | string | undefined;
export type ResponseKind = "json" | "text" | "blob" | "arrayBuffer" | "formData" | "void";
export interface RetryOptions {
    /** Number of retry attempts after the initial try. Omitted/0 disables retries. */
    retries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
}
export interface RequestOptions {
    headers?: HeadersInit;
    /** Caller-supplied signal (e.g. React Query's queryFn signal) — composed with the client timeout, never replaced. */
    signal?: AbortSignal;
    /** Overrides the client's default timeout for this call. */
    timeoutMs?: number;
    /** Opt-in retries. Ignored for non-idempotent methods (POST). `true` uses the defaults. */
    retry?: RetryOptions | boolean;
    responseType?: ResponseKind;
    /** Opt-in, redacted logging of the request/response body. Off by default. */
    logBody?: boolean;
}
export interface ApiLogger {
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
}
export interface ApiClientConfig {
    baseUrl: string;
    headers?: HeadersInit;
    /** Default per-request timeout in ms. Defaults to 30_000. */
    timeoutMs?: number;
    /** Injectable fetch implementation — defaults to `globalThis.fetch`. */
    fetch?: typeof fetch;
    logger?: ApiLogger;
    onError?: (error: ApiError) => void;
}
