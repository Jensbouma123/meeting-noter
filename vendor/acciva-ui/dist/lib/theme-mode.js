"use client";
import { createContext, useContext } from "react";
// Its own context so a consumer that only reads or flips the mode does not pull
// the palette solver (theme-tokens + color) in with `useTheme`.
export const ThemeModeContext = createContext(null);
export function useThemeMode() {
    const ctx = useContext(ThemeModeContext);
    if (!ctx)
        throw new Error("useThemeMode must be used within a ThemeProvider");
    return ctx;
}
