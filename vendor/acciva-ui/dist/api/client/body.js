export function mergeHeaders(defaultHeaders, requestHeaders, body) {
    const headers = new Headers(defaultHeaders);
    new Headers(requestHeaders).forEach((value, key) => headers.set(key, value));
    if (!headers.has("content-type") && isJsonBody(body)) {
        headers.set("content-type", "application/json");
    }
    return headers;
}
function isJsonBody(body) {
    if (body === undefined)
        return false;
    if (typeof FormData !== "undefined" && body instanceof FormData)
        return false;
    if (typeof Blob !== "undefined" && body instanceof Blob)
        return false;
    if (body instanceof URLSearchParams)
        return false;
    if (body instanceof ArrayBuffer)
        return false;
    if (typeof body === "string")
        return false;
    return true;
}
export function encodeBody(body) {
    if (body === undefined)
        return undefined;
    if (typeof FormData !== "undefined" && body instanceof FormData)
        return body;
    if (typeof Blob !== "undefined" && body instanceof Blob)
        return body;
    if (body instanceof URLSearchParams)
        return body;
    if (body instanceof ArrayBuffer)
        return body;
    if (typeof body === "string")
        return body;
    return JSON.stringify(body);
}
