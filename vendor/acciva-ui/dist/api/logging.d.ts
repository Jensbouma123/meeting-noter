import type { ApiLogger } from "./types.js";
export declare function resolveLogger(logger: ApiLogger | undefined): ApiLogger;
export interface RequestLogContext {
    method: string;
    url: string;
    headers?: HeadersInit;
}
export declare function logRequestStart(logger: ApiLogger, ctx: RequestLogContext, body: unknown, logBody: boolean | undefined): void;
export declare function logRequestSuccess(logger: ApiLogger, ctx: RequestLogContext, status: number, durationMs: number): void;
export declare function logRequestFailure(logger: ApiLogger, ctx: RequestLogContext, durationMs: number, error: unknown, status?: number): void;
