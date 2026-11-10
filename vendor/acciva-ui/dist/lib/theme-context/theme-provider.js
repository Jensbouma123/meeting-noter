"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { DEFAULT_HARMONY, DEFAULT_SEED, applyThemeOverrides, resolveAppTheme, } from "../theme-tokens/index.js";
import { ThemeModeContext } from "../theme-mode.js";
import { ThemeContext } from "./context.js";
import { applyStylesheetThemeToDom, applyTokensToDom } from "./dom.js";
import { usePalette } from "./palette.js";
import { SERVER_THEME_SNAPSHOT, getClientThemeSnapshot, getServerThemeSnapshot, subscribeToThemeStorage, } from "./snapshot.js";
import { useThemeState } from "./use-theme-state.js";
export function ThemeProvider({ children, palette: serverPalette, stylesheet, }) {
    // React hydrates against getServerThemeSnapshot() (identical to SSR, so no
    // mismatch), then syncs to the real client value from localStorage/
    // matchMedia right after — the same guarantee useSyncExternalStore gives
    // any external-store read, with no manual "run once after mount" effect.
    const persisted = useSyncExternalStore(subscribeToThemeStorage, getClientThemeSnapshot, getServerThemeSnapshot);
    const { primaryHex, harmony, mode, modeOverride, radius, tokenOverrides, setPrimaryHex, setHarmony, setMode, setRadius, setTokenOverrides, clearTokenOverrides, toggleMode, } = useThemeState(persisted);
    const getPalette = usePalette(serverPalette);
    const stylesheetSeed = stylesheet?.seed ?? DEFAULT_SEED;
    const stylesheetHarmony = stylesheet?.harmony ?? DEFAULT_HARMONY;
    const matchesStylesheet = primaryHex.toLowerCase() === stylesheetSeed.toLowerCase() && harmony === stylesheetHarmony;
    useEffect(() => {
        // The hydration pass renders the server snapshot (always light). Writing it
        // would overwrite the data-theme ThemeInitScript set before paint and flash
        // light on dark devices; the real value follows in the next render.
        if (persisted === SERVER_THEME_SNAPSHOT && modeOverride === null)
            return;
        if (matchesStylesheet) {
            applyStylesheetThemeToDom(mode, radius, tokenOverrides);
            return;
        }
        const base = resolveAppTheme(getPalette(primaryHex, harmony), mode);
        applyTokensToDom(applyThemeOverrides(base, tokenOverrides[mode] ?? {}), radius, tokenOverrides);
    }, [persisted, modeOverride, matchesStylesheet, primaryHex, harmony, mode, radius, tokenOverrides, getPalette]);
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
                resolved ?? (resolved = applyThemeOverrides(resolveAppTheme(getPalette(primaryHex, harmony), mode), tokenOverrides[mode] ?? {}));
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
    const modeValue = useMemo(() => ({ mode, setMode, toggleMode }), [mode, setMode, toggleMode]);
    return (_jsx(ThemeContext.Provider, { value: value, children: _jsx(ThemeModeContext.Provider, { value: modeValue, children: children }) }));
}
