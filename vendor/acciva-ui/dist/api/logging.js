import { createLogger } from "../logger/index.js";
import { redactBodyForLog, redactHeadersForLog, redactUrlForLog } from "./redact.js";
export function resolveLogger(logger) {
    return logger !== null && logger !== void 0 ? logger : createLogger("api");
}
export function logRequestStart(logger, ctx, body, logBody) {
    logger.debug("api.request.start", Object.assign({ method: ctx.method, url: redactUrlForLog(ctx.url), headers: redactHeadersForLog(ctx.headers) }, (logBody ? { body: redactBodyForLog(body) } : {})));
}
export function logRequestSuccess(logger, ctx, status, durationMs) {
    logger.debug("api.request.success", {
        method: ctx.method,
        url: redactUrlForLog(ctx.url),
        status,
        durationMs,
    });
}
export function logRequestFailure(logger, ctx, durationMs, error, status) {
    logger.error("api.request.failure", {
        method: ctx.method,
        url: redactUrlForLog(ctx.url),
        status,
        durationMs,
        error: error instanceof Error ? error.message : String(error),
    });
}
