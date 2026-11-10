export class NetworkError extends Error {
    constructor(message, cause) {
        super(message, { cause });
        this.kind = "network";
        this.name = "NetworkError";
    }
}
export class TimeoutError extends Error {
    constructor(message, timeoutMs) {
        super(message);
        this.timeoutMs = timeoutMs;
        this.kind = "timeout";
        this.name = "TimeoutError";
    }
}
export class AbortError extends Error {
    constructor(message) {
        super(message);
        this.kind = "abort";
        this.name = "AbortError";
    }
}
export class HttpError extends Error {
    constructor(message, status, statusText, url, body, retryAfter = null) {
        super(message);
        this.status = status;
        this.statusText = statusText;
        this.url = url;
        this.body = body;
        this.retryAfter = retryAfter;
        this.kind = "http";
        this.name = "HttpError";
    }
}
export class ParseError extends Error {
    constructor(message, status, cause) {
        super(message, { cause });
        this.status = status;
        this.kind = "parse";
        this.name = "ParseError";
    }
}
export function isApiError(error) {
    return (error instanceof NetworkError ||
        error instanceof TimeoutError ||
        error instanceof AbortError ||
        error instanceof HttpError ||
        error instanceof ParseError);
}
