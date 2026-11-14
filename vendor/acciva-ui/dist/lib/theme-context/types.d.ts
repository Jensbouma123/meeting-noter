import type { HarmonyMode, ThemeMode } from "../color/index.js";
import type { AppTheme, RadiusScale } from "../theme-tokens/index.js";
export type ModeTokenOverrides = {
    light: Record<string, string>;
    dark: Record<string, string>;
};
/** `"system"` (the default) follows `prefers-color-scheme` live and stores nothing. */
export type ThemePreference = "system" | ThemeMode;
export type ThemeContextValue = {
    primaryHex: string;
    harmony: HarmonyMode;
    /** The resolved mode in effect (never `"system"`). */
    mode: ThemeMode;
    /** What the user chose; `"system"` until they pick light or dark. */
    preference: ThemePreference;
    radius: RadiusScale;
    tokens: AppTheme;
    tokenOverrides: ModeTokenOverrides;
    setPrimaryHex: (hex: string) => void;
    setHarmony: (mode: HarmonyMode) => void;
    setMode: (mode: ThemePreference) => void;
    setRadius: (radius: RadiusScale) => void;
    setTokenOverrides: (overrides: Record<string, string>, mode?: ThemeMode) => void;
    clearTokenOverrides: (mode?: ThemeMode) => void;
    toggleMode: () => void;
};
/** A partial write to persist; `mode` may be "system", which clears the stored mode. */
export type ThemePatch = Partial<Omit<StoredThemeSnapshot, "mode">> & {
    mode?: ThemePreference;
};
export type StoredTheme = Partial<{
    primaryHex: string;
    harmony: HarmonyMode;
    mode: ThemeMode;
    radius: RadiusScale;
    tokenOverrides: ModeTokenOverrides;
}>;
export type StoredThemeSnapshot = {
    primaryHex: string;
    harmony: HarmonyMode;
    /** Stored explicit mode, else the system mode. */
    mode: ThemeMode;
    /** The OS scheme right now. */
    systemMode: ThemeMode;
    preference: ThemePreference;
    radius: RadiusScale;
    tokenOverrides: ModeTokenOverrides;
};
