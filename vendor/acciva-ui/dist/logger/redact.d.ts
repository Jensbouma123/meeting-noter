/**
 * Shared redaction for log/request context objects. Both `acciva-ui/logger` and
 * `acciva-ui/api` import this so a secret-bearing key is masked identically wherever
 * it surfaces, instead of each module maintaining its own denylist.
 */
/**
 * Returns a deep copy of `context` with any key matching a known secret-bearing name
 * (case-insensitive: authorization, token, apiKey, password, secret, cookie, set-cookie)
 * replaced with `"[REDACTED]"`. Safe to call on cyclic objects.
 */
export declare function redactContext(context: Record<string, unknown>): Record<string, unknown>;
