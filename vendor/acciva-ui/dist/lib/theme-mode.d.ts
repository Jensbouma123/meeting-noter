import type { ThemeMode } from "./color/types.js";
export type ThemeModeValue = {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    toggleMode: () => void;
};
export declare const ThemeModeContext: import("react").Context<ThemeModeValue | null>;
export declare function useThemeMode(): ThemeModeValue;
