import { HARMONY_MODES, RADIUS_MAP } from "../theme-tokens/index.js";
import { THEME_STORAGE_KEY } from "../theme-storage-key.js";
export const STORAGE_KEY = THEME_STORAGE_KEY;
const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const KNOWN_HARMONIES = new Set(HARMONY_MODES);
// Record shape forces this to be updated if ThemeMode ever gains or loses a member.
const THEME_MODES = {
    light: true,
    dark: true,
};
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function readRawStoredTheme() {
    if (typeof window === "undefined")
        return null;
    try {
        return window.localStorage.getItem(STORAGE_KEY);
    }
    catch {
        return null;
    }
}
function sanitizeOverridesRecord(obj) {
    if (!isPlainObject(obj))
        return {};
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof key === "string" && typeof value === "string") {
            clean[key] = value;
        }
    }
    return clean;
}
export function readStoredTheme() {
    if (typeof window === "undefined")
        return null;
    try {
        const raw = readRawStoredTheme();
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (!isPlainObject(parsed))
            return null;
        const result = {};
        if (typeof parsed.primaryHex === "string" && HEX_COLOR_RE.test(parsed.primaryHex)) {
            result.primaryHex = parsed.primaryHex;
        }
        if (typeof parsed.harmony === "string" && KNOWN_HARMONIES.has(parsed.harmony)) {
            result.harmony = parsed.harmony;
        }
        if (typeof parsed.mode === "string" && parsed.mode in THEME_MODES) {
            result.mode = parsed.mode;
        }
        if (typeof parsed.radius === "string" && parsed.radius in RADIUS_MAP) {
            result.radius = parsed.radius;
        }
        if (isPlainObject(parsed.tokenOverrides)) {
            if (isPlainObject(parsed.tokenOverrides.light) || isPlainObject(parsed.tokenOverrides.dark)) {
                result.tokenOverrides = {
                    light: sanitizeOverridesRecord(parsed.tokenOverrides.light),
                    dark: sanitizeOverridesRecord(parsed.tokenOverrides.dark),
                };
            }
            else {
                const flat = sanitizeOverridesRecord(parsed.tokenOverrides);
                const targetMode = typeof parsed.mode === "string" && parsed.mode in THEME_MODES
                    ? parsed.mode
                    : "light";
                result.tokenOverrides = {
                    light: targetMode === "light" ? flat : {},
                    dark: targetMode === "dark" ? flat : {},
                };
            }
        }
        return result;
    }
    catch {
        return null;
    }
}
export function prefersDarkMode() {
    if (typeof window === "undefined")
        return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}
