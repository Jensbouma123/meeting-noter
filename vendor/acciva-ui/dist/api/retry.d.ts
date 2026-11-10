import type { HttpMethod, RetryOptions } from "./types.js";
import type { ApiError } from "./errors.js";
export interface ResolvedRetryOptions {
    retries: number;
    baseDelayMs: number;
    maxDelayMs: number;
}
export declare function isRetryableMethod(method: HttpMethod): boolean;
export declare function resolveRetryOptions(retry: RetryOptions | boolean | undefined): ResolvedRetryOptions | undefined;
export declare function isRetryableError(error: ApiError): boolean;
export declare function parseRetryAfterMs(headerValue: string | null | undefined): number | undefined;
/** Full-jitter exponential backoff: a random delay in [0, min(maxDelayMs, baseDelayMs * 2^attempt)]. */
export declare function backoffDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number;
export declare function sleep(ms: number, signal?: AbortSignal): Promise<void>;
