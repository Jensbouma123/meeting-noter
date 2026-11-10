import { type Hex, type OKLCH, type ThemeMode } from "../color/index.js";
import { ACTION_PALETTES, type AppPaletteName, type StatusPaletteName, type TailwindStep } from "./constants.js";
import type { AppPalette } from "./app-palette.js";
export declare function stopColor(palette: AppPalette, name: AppPaletteName | StatusPaletteName, stop: TailwindStep): OKLCH;
export declare function solveOnColour(fill: Hex): OKLCH;
export declare function onActionFill(name: (typeof ACTION_PALETTES)[number]): (palette: AppPalette) => OKLCH;
export declare function onStatusFill(name: StatusPaletteName): (palette: AppPalette, mode: ThemeMode) => OKLCH;
