"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { DEFAULT_HARMONY, DEFAULT_SEED, applyThemeOverrides, resolveAppTheme, } from "../theme-tokens/index.js";
import { ThemeModeContext } from "../theme-mode.js";
import { ThemeContext } from "./context.js";
import { applyStylesheetThemeToDom, applyTokensToDom } from "./dom.js";
import { usePalette } from "./palette.js";
import { createServerThemeSnapshot, getClientThemeSnapshot, subscribeToThemeStorage, } from "./snapshot.js";
import { useThemeState } from "./use-theme-state.js";
export function ThemeProvider({ children, palette: serverPalette, stylesheet, }) {
    const stylesheetSeed = stylesheet?.seed ?? DEFAULT_SEED;
    const stylesheetHarmony = stylesheet?.harmony ?? DEFAULT_HARMONY;
    const defaults = useMemo(() => ({ primaryHex: stylesheetSeed, harmony: stylesheetHarmony }), [stylesheetSeed, stylesheetHarmony]);
    // React hydrates against the server snapshot (built from the stylesheet's seed,
    // so it matches SSR), then syncs to the real client value from localStorage/
    // matchMedia right after — the same guarantee useSyncExternalStore gives
    // any external-store read, with no manual "run once after mount" effect.
    const serverSnapshot = useMemo(() => createServerThemeSnapshot(defaults), [defaults]);
    const getServerSnapshot = useCallback(() => serverSnapshot, [serverSnapshot]);
    const getClientSnapshot = useCallback(() => getClientThemeSnapshot(defaults), [defaults]);
    const persisted = useSyncExternalStore(subscribeToThemeStorage, getClientSnapshot, getServerSnapshot);
    const { primaryHex, harmony, mode, preference, modeOverride, radius, tokenOverrides, setPrimaryHex, setHarmony, setMode, setRadius, setTokenOverrides, clearTokenOverrides, toggleMode, } = useThemeState(persisted);
    const getPalette = usePalette(serverPalette);
    const matchesStylesheet = primaryHex.toLowerCase() === stylesheetSeed.toLowerCase() && harmony === stylesheetHarmony;
    useEffect(() => {
        // The hydration pass renders the server snapshot (always light). Writing it
        // would overwrite the data-theme ThemeInitScript set before paint and flash
        // light on dark devices; the real value follows in the next render.
        if (persisted === serverSnapshot && modeOverride === null)
            return;
        if (matchesStylesheet) {
            applyStylesheetThemeToDom(mode, radius, tokenOverrides);
            return;
        }
        const base = resolveAppTheme(getPalette(primaryHex, harmony), mode);
        applyTokensToDom(applyThemeOverrides(base, tokenOverrides[mode] ?? {}), radius, tokenOverrides);
    }, [persisted, serverSnapshot, modeOverride, matchesStylesheet, primaryHex, harmony, mode, radius, tokenOverrides, getPalette]);
    // `tokens` is a memoized getter: the palette is only solved for a consumer
    // that reads it (or when the theme leaves the stylesheet's seed).
    const value = useMemo(() => {
        let resolved;
        return {
            primaryHex,
            harmony,
            mode,
            preference,
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
        preference,
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
    const modeValue = useMemo(() => ({ mode, preference, setMode, toggleMode }), [mode, preference, setMode, toggleMode]);
    return (_jsx(ThemeContext.Provider, { value: value, children: _jsx(ThemeModeContext.Provider, { value: modeValue, children: children }) }));
}
