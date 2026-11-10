import type { HarmonyMode, ThemeMode } from "../color/index.js";
import type { AppTheme, RadiusScale } from "../theme-tokens/index.js";
export type ModeTokenOverrides = {
    light: Record<string, string>;
    dark: Record<string, string>;
};
export type ThemeContextValue = {
    primaryHex: string;
    harmony: HarmonyMode;
    mode: ThemeMode;
    radius: RadiusScale;
    tokens: AppTheme;
    tokenOverrides: ModeTokenOverrides;
    setPrimaryHex: (hex: string) => void;
    setHarmony: (mode: HarmonyMode) => void;
    setMode: (mode: ThemeMode) => void;
    setRadius: (radius: RadiusScale) => void;
    setTokenOverrides: (overrides: Record<string, string>, mode?: ThemeMode) => void;
    clearTokenOverrides: (mode?: ThemeMode) => void;
    toggleMode: () => void;
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
    mode: ThemeMode;
    radius: RadiusScale;
    tokenOverrides: ModeTokenOverrides;
};
