import { linearToSrgb, hexToRgb, rgbToHex, srgbToLinear } from "./rgb.js";
import { oklchToOklab, oklabToOklch } from "./oklch.js";
import { linearRgbToXyz, oklabToXyz, xyzToLinearRgb, xyzToOklab } from "./xyz.js";
export function hexToOklch(hex) {
    return oklabToOklch(xyzToOklab(linearRgbToXyz(srgbToLinear(hexToRgb(hex)))));
}
/**
 * Convert to hex, rounding channels into 0-255. Out-of-gamut input is clamped by
 * that rounding, which shifts hue — call `gamutMap` first for anything that has
 * not been proven in gamut.
 */
export function oklchToHex(color, gamut = "srgb") {
    return rgbToHex(linearToSrgb(xyzToLinearRgb(oklabToXyz(oklchToOklab(color)), gamut)));
}
