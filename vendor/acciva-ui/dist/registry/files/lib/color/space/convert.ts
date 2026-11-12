import type { Gamut, Hex, OKLCH } from "@/lib/color/types";
import { linearToSrgb, hexToRgb, rgbToHex, srgbToLinear } from "@/lib/color/space/rgb";
import { oklchToOklab, oklabToOklch } from "@/lib/color/space/oklch";
import { linearRgbToXyz, oklabToXyz, xyzToLinearRgb, xyzToOklab } from "@/lib/color/space/xyz";

export function hexToOklch(hex: Hex): OKLCH {
  return oklabToOklch(xyzToOklab(linearRgbToXyz(srgbToLinear(hexToRgb(hex)))));
}

/**
 * Convert to hex, rounding channels into 0-255. Out-of-gamut input is clamped by
 * that rounding, which shifts hue — call `gamutMap` first for anything that has
 * not been proven in gamut.
 */
export function oklchToHex(color: OKLCH, gamut: Gamut = "srgb"): Hex {
  return rgbToHex(linearToSrgb(xyzToLinearRgb(oklabToXyz(oklchToOklab(color)), gamut)));
}
