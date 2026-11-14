import type { HarmonyMode, ThemeMode } from "../color/index.js";
import type { RadiusScale } from "../theme-tokens/index.js";
import type { ModeTokenOverrides, StoredThemeSnapshot, ThemePreference } from "./types.js";
export declare function useThemeState(persisted: StoredThemeSnapshot): {
    primaryHex: string;
    harmony: HarmonyMode;
    mode: ThemeMode;
    preference: ThemePreference;
    modeOverride: ThemePreference | null;
    radius: RadiusScale;
    tokenOverrides: ModeTokenOverrides;
    setPrimaryHex: (hex: string) => void;
    setHarmony: (next: HarmonyMode) => void;
    setMode: (next: ThemePreference) => void;
    setRadius: (next: RadiusScale) => void;
    setTokenOverrides: (overrides: Record<string, string>, targetMode?: ThemeMode) => void;
    clearTokenOverrides: (targetMode?: ThemeMode) => void;
    toggleMode: () => void;
};
