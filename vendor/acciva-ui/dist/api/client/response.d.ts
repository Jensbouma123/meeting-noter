import type { ResponseKind } from "../types.js";
export declare function parseResponseBody<T>(response: Response, responseType: ResponseKind | undefined): Promise<T>;
export declare function safeParseErrorBody(response: Response): Promise<unknown>;
