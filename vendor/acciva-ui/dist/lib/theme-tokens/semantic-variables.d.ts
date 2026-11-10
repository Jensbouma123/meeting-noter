import { type ThemeMode } from "../color/index.js";
import { type ThemeVariable } from "./constants.js";
import type { AppPalette } from "./app-palette.js";
/** `--color-<palette>-<stop>`, identical in both modes: a ramp has no mode. */
export declare function paletteVariables(palette: AppPalette): ThemeVariable[];
export declare function semanticVariables(palette: AppPalette, mode: ThemeMode): ThemeVariable[];
