import type { SemanticRoles, ThemeMode, Hex } from "../color/index.js";
import { type BadgePalette, type ThemeVariable } from "./constants.js";
import type { AppPalette } from "./app-palette.js";
import { type SolvableRole } from "./roles.js";
export type AppTheme = AppPalette & {
    readonly mode: ThemeMode;
    readonly roles: Readonly<Record<ThemeMode, SemanticRoles>>;
    readonly primary: Hex;
    readonly secondary: Hex;
    readonly accent: Hex;
    readonly background: Hex;
    readonly surface: Hex;
    readonly foreground: Hex;
    readonly mutedForeground: Hex;
    readonly border: Hex;
    readonly focusRing: Hex;
    readonly success: Hex;
    readonly warning: Hex;
    readonly danger: Hex;
    readonly info: Hex;
    readonly elevation: readonly [Hex, Hex, Hex, Hex, Hex];
    /** What each solvable role currently resolves to, keyed the way pairs are. */
    readonly roleColors: Readonly<Record<SolvableRole, Hex>>;
    readonly badgeBackgrounds: Readonly<Record<BadgePalette, Hex>>;
    readonly variables: readonly ThemeVariable[];
};
/** The cheap half: picks one mode's roles out of an already-built palette. */
export declare function resolveAppTheme(palette: AppPalette, mode: ThemeMode): AppTheme;
