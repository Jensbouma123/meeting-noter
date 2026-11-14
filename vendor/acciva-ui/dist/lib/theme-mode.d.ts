import type { ThemeMode } from "./color/types.js";
export type ThemeModeValue = {
    /** The resolved mode in effect. */
    mode: ThemeMode;
    /** `"system"` (default) follows the OS live; light/dark is a stored explicit choice. */
    preference: "system" | ThemeMode;
    setMode: (mode: "system" | ThemeMode) => void;
    toggleMode: () => void;
};
export declare const ThemeModeContext: import("react").Context<ThemeModeValue | null>;
export declare function useThemeMode(): ThemeModeValue;
