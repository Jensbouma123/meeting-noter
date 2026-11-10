import { type ReactNode } from "react";
import type { HarmonyMode, ThemeMode } from "../lib/color/index.js";
import { RADIUS_MAP, type AppPalette, type AppTheme, type RadiusScale } from "../lib/theme-tokens.js";
export { RADIUS_MAP, type RadiusScale };
export type ModeTokenOverrides = {
    light: Record<string, string>;
    dark: Record<string, string>;
};
type ThemeContextValue = {
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
export declare function ThemeProvider({ children, palette: serverPalette, stylesheet, }: {
    children: ReactNode;
    /** A palette built ahead of time (e.g. `buildAppPalette` in a Server Component); used while its seed and harmony are the active ones. */
    palette?: AppPalette;
    /**
     * The seed and harmony the page's stylesheet already declares (default: the shipped theme).
     * While they are the active ones the provider trusts the CSS variables and never runs the solver.
     */
    stylesheet?: {
        seed: string;
        harmony?: HarmonyMode;
    };
}): import("react").JSX.Element;
export declare function useTheme(): ThemeContextValue;
