import { redactContext } from "../logger/index.js";
/**
 * Header/URL redaction is HTTP-specific (which headers, which query params) and lives
 * here; the actual secret-matching logic is the logger layer's shared redactor — see
 * `.agents/lib/api.md` for the integration contract this file depends on.
 */
function redactUnknown(value) {
    if (value === null || typeof value !== "object")
        return value;
    if (Array.isArray(value))
        return value.map(redactUnknown);
    return redactContext(value);
}
function headersInitToRecord(headers) {
    const result = {};
    if (!headers)
        return result;
    if (headers instanceof Headers) {
        headers.forEach((value, key) => {
            result[key] = value;
        });
    }
    else if (Array.isArray(headers)) {
        for (const [key, value] of headers)
            result[key] = value;
    }
    else {
        Object.assign(result, headers);
    }
    return result;
}
export function redactHeadersForLog(headers) {
    return redactContext(headersInitToRecord(headers));
}
export function redactUrlForLog(rawUrl) {
    try {
        const url = new URL(rawUrl);
        const params = Object.fromEntries(url.searchParams.entries());
        const redactedParams = redactContext(params);
        const nextSearch = new URLSearchParams();
        for (const [key, value] of Object.entries(redactedParams)) {
            nextSearch.set(key, value);
        }
        url.search = nextSearch.toString();
        return url.toString();
    }
    catch {
        return rawUrl;
    }
}
export function redactBodyForLog(body) {
    if (body === undefined)
        return undefined;
    if (typeof FormData !== "undefined" && body instanceof FormData)
        return "[FormData]";
    if (typeof Blob !== "undefined" && body instanceof Blob)
        return "[Blob]";
    if (body instanceof URLSearchParams)
        return redactContext(Object.fromEntries(body.entries()));
    return redactUnknown(body);
}
