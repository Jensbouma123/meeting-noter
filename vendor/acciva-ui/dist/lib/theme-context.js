"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, } from "react";
import { DEFAULT_HARMONY, DEFAULT_RADIUS, DEFAULT_SEED, HARMONY_MODES, RADIUS_BASE_VARIABLE, RADIUS_MAP, applyThemeOverrides, buildAppPalette, resolveAppTheme, } from "../lib/theme-tokens.js";
import { THEME_STORAGE_KEY } from "../lib/theme-storage-key.js";
// The scale itself is pure data and lives with the rest of the token vocabulary
// so `scripts/generate-tokens.ts` can read it without pulling in React; it is
// re-exported here because that is where every consumer already imports it from.
export { RADIUS_MAP };
const ThemeContext = createContext(null);
const DEFAULT_PRIMARY = DEFAULT_SEED;
const STORAGE_KEY = THEME_STORAGE_KEY;
// An inline style holds one value per property, so it cannot carry the
// hex-then-oklch fallback pair the generated stylesheet uses. The engine is
// asked once whether the browser understands CSS Color 4 and every property is
// written in the form that engine can read.
let oklchSupport = null;
function supportsOklch() {
    if (oklchSupport !== null)
        return oklchSupport;
    oklchSupport =
        typeof CSS !== "undefined" &&
            typeof CSS.supports === "function" &&
            CSS.supports("color", "oklch(0.5 0.1 200)");
    return oklchSupport;
}
// The names this module has set inline on <html>. Returning to the default
// theme removes exactly these, so inline properties other code owns (the
// `--font-acciva-custom` alias fonts.ts writes) stay in place.
const writtenProperties = new Set();
function setRootProperty(root, name, value) {
    root.style.setProperty(name, value);
    writtenProperties.add(name);
}
function applyTokensToDom(theme, radius = DEFAULT_RADIUS, tokenOverrides = { light: {}, dark: {} }) {
    var _a;
    const root = document.documentElement;
    const activeOverrides = "light" in tokenOverrides || "dark" in tokenOverrides
        ? (_a = tokenOverrides[theme.mode]) !== null && _a !== void 0 ? _a : {}
        : tokenOverrides;
    const useOklch = supportsOklch();
    setRootProperty(root, RADIUS_BASE_VARIABLE, RADIUS_MAP[radius].rem);
    for (const entry of theme.variables) {
        setRootProperty(root, entry.name, useOklch ? entry.literal : entry.hex);
    }
    for (const [key, value] of Object.entries(activeOverrides)) {
        setRootProperty(root, key, value);
    }
    root.setAttribute("data-theme", theme.mode);
}
// The stylesheet already declares this seed and harmony for both modes, so the
// token properties stay as shipped: only the mode attribute, the radius and the
// per-mode overrides (keyed by CSS property name, so no palette is needed) are
// written. Anything an earlier non-matching theme wrote inline is removed first.
function applyStylesheetThemeToDom(mode, radius, tokenOverrides) {
    var _a;
    const root = document.documentElement;
    for (const name of writtenProperties)
        root.style.removeProperty(name);
    writtenProperties.clear();
    if (radius !== DEFAULT_RADIUS)
        setRootProperty(root, RADIUS_BASE_VARIABLE, RADIUS_MAP[radius].rem);
    for (const [key, value] of Object.entries((_a = tokenOverrides[mode]) !== null && _a !== void 0 ? _a : {})) {
        setRootProperty(root, key, value);
    }
    root.setAttribute("data-theme", mode);
}
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
function readRawStoredTheme() {
    if (typeof window === "undefined")
        return null;
    try {
        return window.localStorage.getItem(STORAGE_KEY);
    }
    catch (_a) {
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
function readStoredTheme() {
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
    catch (_a) {
        return null;
    }
}
function prefersDarkMode() {
    var _a, _b;
    if (typeof window === "undefined")
        return false;
    return (_b = (_a = window.matchMedia) === null || _a === void 0 ? void 0 : _a.call(window, "(prefers-color-scheme: dark)").matches) !== null && _b !== void 0 ? _b : false;
}
const EMPTY_TOKEN_OVERRIDES = { light: {}, dark: {} };
// The value SSR (and the client's first hydration pass) must agree on —
// identical to the defaults above, so there is nothing for React to reconcile.
const SERVER_THEME_SNAPSHOT = {
    primaryHex: DEFAULT_PRIMARY,
    harmony: DEFAULT_HARMONY,
    mode: "light",
    radius: DEFAULT_RADIUS,
    tokenOverrides: EMPTY_TOKEN_OVERRIDES,
};
function getServerThemeSnapshot() {
    return SERVER_THEME_SNAPSHOT;
}
// useSyncExternalStore requires a stable reference when nothing changed —
// otherwise every render would look like a new value and loop forever.
let cachedRawTheme;
let cachedPrefersDark;
let cachedThemeSnapshot = null;
function getClientThemeSnapshot() {
    var _a, _b, _c, _d, _e;
    const raw = readRawStoredTheme();
    const prefersDark = prefersDarkMode();
    if (cachedThemeSnapshot && raw === cachedRawTheme && prefersDark === cachedPrefersDark) {
        return cachedThemeSnapshot;
    }
    cachedRawTheme = raw;
    cachedPrefersDark = prefersDark;
    const stored = readStoredTheme();
    cachedThemeSnapshot = {
        primaryHex: (_a = stored === null || stored === void 0 ? void 0 : stored.primaryHex) !== null && _a !== void 0 ? _a : DEFAULT_PRIMARY,
        harmony: (_b = stored === null || stored === void 0 ? void 0 : stored.harmony) !== null && _b !== void 0 ? _b : DEFAULT_HARMONY,
        mode: (_c = stored === null || stored === void 0 ? void 0 : stored.mode) !== null && _c !== void 0 ? _c : (prefersDark ? "dark" : "light"),
        radius: (_d = stored === null || stored === void 0 ? void 0 : stored.radius) !== null && _d !== void 0 ? _d : DEFAULT_RADIUS,
        tokenOverrides: (_e = stored === null || stored === void 0 ? void 0 : stored.tokenOverrides) !== null && _e !== void 0 ? _e : EMPTY_TOKEN_OVERRIDES,
    };
    return cachedThemeSnapshot;
}
function subscribeToThemeStorage(callback) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    window.addEventListener("storage", callback);
    media.addEventListener("change", callback);
    return () => {
        window.removeEventListener("storage", callback);
        media.removeEventListener("change", callback);
    };
}
function paletteMatches(palette, seed, harmony) {
    return palette.harmony === harmony && palette.seed.toLowerCase() === seed.toLowerCase();
}
export function ThemeProvider({ children, palette: serverPalette, stylesheet, }) {
    var _a, _b, _c;
    // React hydrates against getServerThemeSnapshot() (identical to SSR, so no
    // mismatch), then syncs to the real client value from localStorage/
    // matchMedia right after — the same guarantee useSyncExternalStore gives
    // any external-store read, with no manual "run once after mount" effect.
    const persisted = useSyncExternalStore(subscribeToThemeStorage, getClientThemeSnapshot, getServerThemeSnapshot);
    // Explicit in-session choices win over the persisted/system value once made.
    const [primaryHexOverride, setPrimaryHexOverride] = useState(null);
    const [harmonyOverride, setHarmonyOverride] = useState(null);
    const [modeOverride, setModeOverride] = useState(null);
    const [radiusOverride, setRadiusOverride] = useState(null);
    const [tokenOverridesOverride, setTokenOverridesOverride] = useState(null);
    const primaryHex = primaryHexOverride !== null && primaryHexOverride !== void 0 ? primaryHexOverride : persisted.primaryHex;
    const harmony = harmonyOverride !== null && harmonyOverride !== void 0 ? harmonyOverride : persisted.harmony;
    const mode = modeOverride !== null && modeOverride !== void 0 ? modeOverride : persisted.mode;
    const radius = radiusOverride !== null && radiusOverride !== void 0 ? radiusOverride : persisted.radius;
    const tokenOverrides = (_a = tokenOverridesOverride !== null && tokenOverridesOverride !== void 0 ? tokenOverridesOverride : persisted.tokenOverrides) !== null && _a !== void 0 ? _a : EMPTY_TOKEN_OVERRIDES;
    // A caller that writes both modes does it with two calls in one event — and a
    // state setter's closure still holds the pre-event value when the second one
    // runs, so reading the base off `tokenOverrides` would drop the first mode.
    // The ref is that base: re-synced from the rendered value in an effect, and
    // advanced by each write so the next write in the same event builds on it.
    const tokenOverridesRef = useRef(tokenOverrides);
    useEffect(() => {
        tokenOverridesRef.current = tokenOverrides;
    }, [tokenOverrides]);
    // The solver is the cost (~200ms desktop, ~2.7s on throttled mobile), so it
    // is lazy: nothing is built while the stylesheet already describes the active
    // seed and harmony. The palette depends only on seed and harmony, so the last
    // one is cached and a light/dark toggle re-picks roles without rebuilding.
    const paletteCache = useRef(null);
    const getPalette = useCallback((seed, harmonyMode) => {
        var _a;
        if (serverPalette && paletteMatches(serverPalette, seed, harmonyMode))
            return serverPalette;
        const key = `${seed.toLowerCase()}|${harmonyMode}`;
        if (((_a = paletteCache.current) === null || _a === void 0 ? void 0 : _a.key) !== key) {
            paletteCache.current = { key, palette: buildAppPalette(seed, harmonyMode) };
        }
        return paletteCache.current.palette;
    }, [serverPalette]);
    const stylesheetSeed = (_b = stylesheet === null || stylesheet === void 0 ? void 0 : stylesheet.seed) !== null && _b !== void 0 ? _b : DEFAULT_SEED;
    const stylesheetHarmony = (_c = stylesheet === null || stylesheet === void 0 ? void 0 : stylesheet.harmony) !== null && _c !== void 0 ? _c : DEFAULT_HARMONY;
    const matchesStylesheet = primaryHex.toLowerCase() === stylesheetSeed.toLowerCase() && harmony === stylesheetHarmony;
    useEffect(() => {
        var _a;
        if (matchesStylesheet) {
            applyStylesheetThemeToDom(mode, radius, tokenOverrides);
            return;
        }
        const base = resolveAppTheme(getPalette(primaryHex, harmony), mode);
        applyTokensToDom(applyThemeOverrides(base, (_a = tokenOverrides[mode]) !== null && _a !== void 0 ? _a : {}), radius, tokenOverrides);
    }, [matchesStylesheet, primaryHex, harmony, mode, radius, tokenOverrides, getPalette]);
    const persist = useCallback((patch) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        try {
            const currentStored = readStoredTheme();
            const next = {
                primaryHex: (_b = (_a = patch.primaryHex) !== null && _a !== void 0 ? _a : currentStored === null || currentStored === void 0 ? void 0 : currentStored.primaryHex) !== null && _b !== void 0 ? _b : primaryHex,
                harmony: (_d = (_c = patch.harmony) !== null && _c !== void 0 ? _c : currentStored === null || currentStored === void 0 ? void 0 : currentStored.harmony) !== null && _d !== void 0 ? _d : harmony,
                mode: (_f = (_e = patch.mode) !== null && _e !== void 0 ? _e : currentStored === null || currentStored === void 0 ? void 0 : currentStored.mode) !== null && _f !== void 0 ? _f : mode,
                radius: (_h = (_g = patch.radius) !== null && _g !== void 0 ? _g : currentStored === null || currentStored === void 0 ? void 0 : currentStored.radius) !== null && _h !== void 0 ? _h : radius,
                tokenOverrides: (_k = (_j = patch.tokenOverrides) !== null && _j !== void 0 ? _j : currentStored === null || currentStored === void 0 ? void 0 : currentStored.tokenOverrides) !== null && _k !== void 0 ? _k : tokenOverrides,
            };
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        catch (_l) {
            // storage unavailable (private mode, quota) — theme still works in-memory
        }
    }, [primaryHex, harmony, mode, radius, tokenOverrides]);
    const setPrimaryHex = useCallback((hex) => {
        setPrimaryHexOverride(hex);
        persist({ primaryHex: hex });
    }, [persist]);
    const setHarmony = useCallback((next) => {
        setHarmonyOverride(next);
        persist({ harmony: next });
    }, [persist]);
    const setMode = useCallback((next) => {
        setModeOverride(next);
        persist({ mode: next });
    }, [persist]);
    const setRadius = useCallback((next) => {
        setRadiusOverride(next);
        persist({ radius: next });
    }, [persist]);
    const writeTokenOverrides = useCallback((targetMode, overrides) => {
        const nextOverrides = Object.assign(Object.assign({}, tokenOverridesRef.current), { [targetMode]: overrides });
        tokenOverridesRef.current = nextOverrides;
        setTokenOverridesOverride(nextOverrides);
        persist({ tokenOverrides: nextOverrides });
    }, [persist]);
    const setTokenOverrides = useCallback((overrides, targetMode) => {
        writeTokenOverrides(targetMode !== null && targetMode !== void 0 ? targetMode : mode, overrides);
    }, [mode, writeTokenOverrides]);
    const clearTokenOverrides = useCallback((targetMode) => {
        if (targetMode) {
            writeTokenOverrides(targetMode, {});
            return;
        }
        const nextOverrides = { light: {}, dark: {} };
        tokenOverridesRef.current = nextOverrides;
        setTokenOverridesOverride(nextOverrides);
        persist({ tokenOverrides: nextOverrides });
    }, [persist, writeTokenOverrides]);
    const toggleMode = useCallback(() => {
        const next = mode === "light" ? "dark" : "light";
        setModeOverride(next);
        persist({ mode: next });
    }, [mode, persist]);
    // `tokens` is a memoized getter: the palette is only solved for a consumer
    // that reads it (or when the theme leaves the stylesheet's seed).
    const value = useMemo(() => {
        let resolved;
        return {
            primaryHex,
            harmony,
            mode,
            radius,
            get tokens() {
                var _a;
                resolved !== null && resolved !== void 0 ? resolved : (resolved = applyThemeOverrides(resolveAppTheme(getPalette(primaryHex, harmony), mode), (_a = tokenOverrides[mode]) !== null && _a !== void 0 ? _a : {}));
                return resolved;
            },
            tokenOverrides,
            setPrimaryHex,
            setHarmony,
            setMode,
            setRadius,
            setTokenOverrides,
            clearTokenOverrides,
            toggleMode,
        };
    }, [
        primaryHex,
        harmony,
        mode,
        radius,
        tokenOverrides,
        getPalette,
        setPrimaryHex,
        setHarmony,
        setMode,
        setRadius,
        setTokenOverrides,
        clearTokenOverrides,
        toggleMode,
    ]);
    return _jsx(ThemeContext.Provider, { value: value, children: children });
}
export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx)
        throw new Error("useTheme must be used within a ThemeProvider");
    return ctx;
}
