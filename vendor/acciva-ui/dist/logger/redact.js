/**
 * Shared redaction for log/request context objects. Both `acciva-ui/logger` and
 * `acciva-ui/api` import this so a secret-bearing key is masked identically wherever
 * it surfaces, instead of each module maintaining its own denylist.
 */
const REDACTED = "[REDACTED]";
const SENSITIVE_KEYS = new Set([
    "authorization",
    "token",
    "apikey",
    "password",
    "secret",
    "cookie",
    "set-cookie",
]);
function isSensitiveKey(key) {
    return SENSITIVE_KEYS.has(key.toLowerCase());
}
const CIRCULAR = "[Circular]";
// `ancestors` holds only the objects on the current path, so a cycle is cut
// while a shared (non-cyclic) reference is copied in full at every site.
function redactValue(value, ancestors) {
    if (value === null || typeof value !== "object")
        return value;
    if (value instanceof Date || value instanceof URL)
        return value;
    if (ancestors.has(value))
        return CIRCULAR;
    ancestors.add(value);
    try {
        if (Array.isArray(value))
            return value.map((item) => redactValue(item, ancestors));
        // Error's name/message are non-enumerable; copy them explicitly after the spread.
        const source = value instanceof Error ? { ...value, name: value.name, message: value.message } : value;
        return redactObject(source, ancestors);
    }
    finally {
        ancestors.delete(value);
    }
}
function redactObject(input, ancestors) {
    const output = {};
    for (const [key, value] of Object.entries(input)) {
        output[key] = isSensitiveKey(key) ? REDACTED : redactValue(value, ancestors);
    }
    return output;
}
/**
 * Returns a deep copy of `context` with any key matching a known secret-bearing name
 * (case-insensitive: authorization, token, apiKey, password, secret, cookie, set-cookie)
 * replaced with `"[REDACTED]"`. Safe to call on cyclic objects.
 */
export function redactContext(context) {
    return redactObject(context, new WeakSet());
}
