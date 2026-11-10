import type { RequestBody } from "../types.js";
export declare function mergeHeaders(defaultHeaders: HeadersInit | undefined, requestHeaders: HeadersInit | undefined, body: RequestBody): Headers;
export declare function encodeBody(body: RequestBody): BodyInit | undefined;
