import { DEFAULT_HARMONY, DEFAULT_RADIUS, DEFAULT_SEED } from "../theme-tokens/index.js";
import { prefersDarkMode, readRawStoredTheme, readStoredTheme } from "./storage.js";
export const DEFAULT_SNAPSHOT_DEFAULTS = {
    primaryHex: DEFAULT_SEED,
    harmony: DEFAULT_HARMONY,
};
export const EMPTY_TOKEN_OVERRIDES = { light: {}, dark: {} };
// The value SSR (and the client's first hydration pass) must agree on. Built from
// the stylesheet's own seed and harmony, so the server context matches the CSS.
export function createServerThemeSnapshot(defaults) {
    return {
        primaryHex: defaults.primaryHex,
        harmony: defaults.harmony,
        mode: "light",
        systemMode: "light",
        preference: "system",
        radius: DEFAULT_RADIUS,
        tokenOverrides: EMPTY_TOKEN_OVERRIDES,
    };
}
// useSyncExternalStore requires a stable reference when nothing changed —
// otherwise every render would look like a new value and loop forever.
let cachedRawTheme;
let cachedPrefersDark;
let cachedDefaults;
let cachedThemeSnapshot = null;
export function getClientThemeSnapshot(defaults) {
    const raw = readRawStoredTheme();
    const prefersDark = prefersDarkMode();
    if (cachedThemeSnapshot &&
        raw === cachedRawTheme &&
        prefersDark === cachedPrefersDark &&
        defaults === cachedDefaults) {
        return cachedThemeSnapshot;
    }
    cachedRawTheme = raw;
    cachedPrefersDark = prefersDark;
    cachedDefaults = defaults;
    const stored = readStoredTheme();
    cachedThemeSnapshot = {
        primaryHex: stored?.primaryHex ?? defaults.primaryHex,
        harmony: stored?.harmony ?? defaults.harmony,
        mode: stored?.mode ?? (prefersDark ? "dark" : "light"),
        systemMode: prefersDark ? "dark" : "light",
        preference: stored?.mode ?? "system",
        radius: stored?.radius ?? DEFAULT_RADIUS,
        tokenOverrides: stored?.tokenOverrides ?? EMPTY_TOKEN_OVERRIDES,
    };
    return cachedThemeSnapshot;
}
export function subscribeToThemeStorage(callback) {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    window.addEventListener("storage", callback);
    media?.addEventListener("change", callback);
    return () => {
        window.removeEventListener("storage", callback);
        media?.removeEventListener("change", callback);
    };
}
