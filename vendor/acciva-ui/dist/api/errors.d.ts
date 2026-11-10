export type ApiErrorKind = "network" | "timeout" | "abort" | "http" | "parse";
export declare class NetworkError extends Error {
    readonly kind: "network";
    constructor(message: string, cause: unknown);
}
export declare class TimeoutError extends Error {
    readonly timeoutMs: number;
    readonly kind: "timeout";
    constructor(message: string, timeoutMs: number);
}
export declare class AbortError extends Error {
    readonly kind: "abort";
    constructor(message: string);
}
export declare class HttpError extends Error {
    readonly status: number;
    readonly statusText: string;
    readonly url: string;
    readonly body: unknown;
    readonly retryAfter: string | null;
    readonly kind: "http";
    constructor(message: string, status: number, statusText: string, url: string, body: unknown, retryAfter?: string | null);
}
export declare class ParseError extends Error {
    readonly status: number;
    readonly kind: "parse";
    constructor(message: string, status: number, cause: unknown);
}
export type ApiError = NetworkError | TimeoutError | AbortError | HttpError | ParseError;
export declare function isApiError(error: unknown): error is ApiError;
