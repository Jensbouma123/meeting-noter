import { DEFAULT_HARMONY, DEFAULT_RADIUS, DEFAULT_SEED } from "../theme-tokens/index.js";
import { prefersDarkMode, readRawStoredTheme, readStoredTheme } from "./storage.js";
const DEFAULT_PRIMARY = DEFAULT_SEED;
export const EMPTY_TOKEN_OVERRIDES = { light: {}, dark: {} };
// The value SSR (and the client's first hydration pass) must agree on —
// identical to the defaults above, so there is nothing for React to reconcile.
export const SERVER_THEME_SNAPSHOT = {
    primaryHex: DEFAULT_PRIMARY,
    harmony: DEFAULT_HARMONY,
    mode: "light",
    radius: DEFAULT_RADIUS,
    tokenOverrides: EMPTY_TOKEN_OVERRIDES,
};
export function getServerThemeSnapshot() {
    return SERVER_THEME_SNAPSHOT;
}
// useSyncExternalStore requires a stable reference when nothing changed —
// otherwise every render would look like a new value and loop forever.
let cachedRawTheme;
let cachedPrefersDark;
let cachedThemeSnapshot = null;
export function getClientThemeSnapshot() {
    const raw = readRawStoredTheme();
    const prefersDark = prefersDarkMode();
    if (cachedThemeSnapshot && raw === cachedRawTheme && prefersDark === cachedPrefersDark) {
        return cachedThemeSnapshot;
    }
    cachedRawTheme = raw;
    cachedPrefersDark = prefersDark;
    const stored = readStoredTheme();
    cachedThemeSnapshot = {
        primaryHex: stored?.primaryHex ?? DEFAULT_PRIMARY,
        harmony: stored?.harmony ?? DEFAULT_HARMONY,
        mode: stored?.mode ?? (prefersDark ? "dark" : "light"),
        radius: stored?.radius ?? DEFAULT_RADIUS,
        tokenOverrides: stored?.tokenOverrides ?? EMPTY_TOKEN_OVERRIDES,
    };
    return cachedThemeSnapshot;
}
export function subscribeToThemeStorage(callback) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    window.addEventListener("storage", callback);
    media.addEventListener("change", callback);
    return () => {
        window.removeEventListener("storage", callback);
        media.removeEventListener("change", callback);
    };
}
