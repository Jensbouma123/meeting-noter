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
        const nextSearch = new URLSearchParams();
        // Per entry, so duplicate keys (`?a=1&a=2`) survive and each value is redacted.
        for (const [key, value] of url.searchParams.entries()) {
            nextSearch.append(key, String(redactContext({ [key]: value })[key]));
        }
        url.search = nextSearch.toString();
        return url.toString();
    }
    catch {
        // Never echo an unparseable URL: it may still carry live credentials.
        return "[invalid-url]";
    }
}
export function redactBodyForLog(body) {
    if (body === undefined)
        return undefined;
    if (typeof FormData !== "undefined" && body instanceof FormData)
        return "[FormData]";
    if (typeof Blob !== "undefined" && body instanceof Blob)
        return "[Blob]";
    if (body instanceof ArrayBuffer || ArrayBuffer.isView(body))
        return "[Binary]";
    if (body instanceof URLSearchParams)
        return redactContext(Object.fromEntries(body.entries()));
    return redactUnknown(body);
}
