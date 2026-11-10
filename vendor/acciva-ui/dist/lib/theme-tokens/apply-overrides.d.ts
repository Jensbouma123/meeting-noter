import type { AppTheme } from "./app-theme.js";
/**
 * Applies CSS variable overrides to an AppTheme, updating its variables,
 * primitive shade scales (e.g. `--color-primary-800`), and semantic role fields.
 */
export declare function applyThemeOverrides(baseTokens: AppTheme, overrides: Record<string, string>): AppTheme;
