// Package entry for the "./theme" export. Deliberately has no "use client"
// directive of its own: `themeInitScript` and `<ThemeInitScript />` must stay
// server-readable so a root layout (a Server Component) gets the real string,
// while `ThemeProvider`/`useTheme` keep the client boundary their own module
// declares.
export { ThemeProvider, useTheme } from "../lib/theme-context/index.js";
// Vendored components (`acciva add`) import the mode context from here so they share the provider's instance.
export { ThemeModeContext, useThemeMode } from "../lib/theme-mode.js";
export { THEME_STORAGE_KEY } from "../lib/theme-storage-key.js";
export { PRESET_PALETTES, buildAppPalette, buildPresetTheme, } from "../lib/theme-tokens/index.js";
export { themeStylesheet } from "./theme-stylesheet.js";
export { ThemeInitScript, themeInitScript } from "./theme-init-script.js";
