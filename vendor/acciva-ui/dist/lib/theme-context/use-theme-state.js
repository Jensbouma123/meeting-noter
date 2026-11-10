import { useCallback, useEffect, useRef, useState } from "react";
import { EMPTY_TOKEN_OVERRIDES } from "./snapshot.js";
import { readStoredTheme, STORAGE_KEY } from "./storage.js";
export function useThemeState(persisted) {
    // Explicit in-session choices win over the persisted/system value once made.
    const [primaryHexOverride, setPrimaryHexOverride] = useState(null);
    const [harmonyOverride, setHarmonyOverride] = useState(null);
    const [modeOverride, setModeOverride] = useState(null);
    const [radiusOverride, setRadiusOverride] = useState(null);
    const [tokenOverridesOverride, setTokenOverridesOverride] = useState(null);
    const primaryHex = primaryHexOverride ?? persisted.primaryHex;
    const harmony = harmonyOverride ?? persisted.harmony;
    const mode = modeOverride ?? persisted.mode;
    const radius = radiusOverride ?? persisted.radius;
    const tokenOverrides = tokenOverridesOverride ?? persisted.tokenOverrides ?? EMPTY_TOKEN_OVERRIDES;
    // A caller that writes both modes does it with two calls in one event — and a
    // state setter's closure still holds the pre-event value when the second one
    // runs, so reading the base off `tokenOverrides` would drop the first mode.
    // The ref is that base: re-synced from the rendered value in an effect, and
    // advanced by each write so the next write in the same event builds on it.
    const tokenOverridesRef = useRef(tokenOverrides);
    useEffect(() => {
        tokenOverridesRef.current = tokenOverrides;
    }, [tokenOverrides]);
    const persist = useCallback((patch) => {
        try {
            const currentStored = readStoredTheme();
            const next = {
                primaryHex: patch.primaryHex ?? currentStored?.primaryHex ?? primaryHex,
                harmony: patch.harmony ?? currentStored?.harmony ?? harmony,
                mode: patch.mode ?? currentStored?.mode ?? mode,
                radius: patch.radius ?? currentStored?.radius ?? radius,
                tokenOverrides: patch.tokenOverrides ?? currentStored?.tokenOverrides ?? tokenOverrides,
            };
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        catch {
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
        const nextOverrides = {
            ...tokenOverridesRef.current,
            [targetMode]: overrides,
        };
        tokenOverridesRef.current = nextOverrides;
        setTokenOverridesOverride(nextOverrides);
        persist({ tokenOverrides: nextOverrides });
    }, [persist]);
    const setTokenOverrides = useCallback((overrides, targetMode) => {
        writeTokenOverrides(targetMode ?? mode, overrides);
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
    return {
        primaryHex,
        harmony,
        mode,
        modeOverride,
        radius,
        tokenOverrides,
        setPrimaryHex,
        setHarmony,
        setMode,
        setRadius,
        setTokenOverrides,
        clearTokenOverrides,
        toggleMode,
    };
}
