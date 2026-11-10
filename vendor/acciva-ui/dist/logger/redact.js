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
function redactValue(value, seen) {
    if (Array.isArray(value)) {
        return value.map((item) => redactValue(item, seen));
    }
    if (value !== null && typeof value === "object") {
        if (seen.has(value))
            return REDACTED;
        seen.add(value);
        return redactObject(value, seen);
    }
    return value;
}
function redactObject(input, seen) {
    const output = {};
    for (const [key, value] of Object.entries(input)) {
        output[key] = isSensitiveKey(key) ? REDACTED : redactValue(value, seen);
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
