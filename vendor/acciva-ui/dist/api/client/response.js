import { ParseError } from "../errors.js";
export async function parseResponseBody(response, responseType) {
    if (response.status === 204 || response.status === 205) {
        return undefined;
    }
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    const kind = responseType ?? inferResponseKind(contentType);
    if (kind === "void")
        return undefined;
    if (kind === "json") {
        const text = await response.text();
        if (text.length === 0)
            return undefined;
        try {
            return JSON.parse(text);
        }
        catch (cause) {
            throw new ParseError("Failed to parse JSON response body", response.status, cause);
        }
    }
    if (kind === "text")
        return (await response.text());
    if (kind === "blob") {
        const blob = await response.blob();
        // No Content-Type and no bytes: the documented empty-body result, not an empty Blob.
        return (contentType === "" && blob.size === 0 ? undefined : blob);
    }
    if (kind === "arrayBuffer")
        return (await response.arrayBuffer());
    return (await response.formData());
}
// `contentType` arrives lowercased. A missing header falls through to "blob", so a
// body without a type is kept; an empty one is turned into `undefined` by the caller.
function inferResponseKind(contentType) {
    if (contentType.includes("json"))
        return "json";
    if (contentType.startsWith("text/"))
        return "text";
    return "blob";
}
export async function safeParseErrorBody(response) {
    try {
        const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
        if (contentType.includes("json")) {
            const text = await response.text();
            return text.length > 0 ? JSON.parse(text) : undefined;
        }
        if (contentType.startsWith("text/"))
            return await response.text();
        return undefined;
    }
    catch {
        return undefined;
    }
}
