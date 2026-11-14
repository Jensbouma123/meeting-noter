import type { StoredTheme, StoredThemeSnapshot, ThemePatch } from "./types.js";
export declare function mergeStoredTheme(patch: ThemePatch, stored: StoredTheme | null, fallback: Pick<StoredThemeSnapshot, "primaryHex" | "harmony" | "radius" | "tokenOverrides">): {
    primaryHex: string;
    harmony: import("../color/index.js").HarmonyMode;
    mode: import("../color/index.js").ThemeMode | undefined;
    radius: import("./index.js").RadiusScale;
    tokenOverrides: import("./types.js").ModeTokenOverrides;
};
