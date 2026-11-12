import { contrastRatio, hexToOklch, oklchToHex, type Hex, type OKLCH, type ThemeMode } from "@/lib/color/index";
import { ACTION_PALETTES, ACTION_STEP, type AppPaletteName, type StatusPaletteName, type TailwindStep } from "@/lib/theme-tokens/constants";
import type { AppPalette } from "@/lib/theme-tokens/app-palette";

export function stopColor(
  palette: AppPalette,
  name: AppPaletteName | StatusPaletteName,
  stop: TailwindStep,
): OKLCH {
  return palette.ramps[name][palette.aliases[stop]] as OKLCH;
}

/**
 * The two candidates an on-colour is solved from. White is preferred whenever
 * it clears WCAG 2.2 AA SC 1.4.3 (4.5:1) against the fill; otherwise the fill
 * is light and black is the colour that clears it. The choice is a function of
 * the fill, measured per mode — never an assumed white.
 */
const ON_COLOUR_LIGHT: Hex = "#ffffff";
const ON_COLOUR_DARK: Hex = "#000000";

export function solveOnColour(fill: Hex): OKLCH {
  return hexToOklch(contrastRatio(ON_COLOUR_LIGHT, fill) >= 4.5 ? ON_COLOUR_LIGHT : ON_COLOUR_DARK);
}

export function onActionFill(name: (typeof ACTION_PALETTES)[number]): (palette: AppPalette) => OKLCH {
  return (palette) => solveOnColour(oklchToHex(stopColor(palette, name, ACTION_STEP)));
}

export function onStatusFill(name: StatusPaletteName): (palette: AppPalette, mode: ThemeMode) => OKLCH {
  return (palette, mode) => solveOnColour(oklchToHex(palette.roles[mode].status[name].color));
}
