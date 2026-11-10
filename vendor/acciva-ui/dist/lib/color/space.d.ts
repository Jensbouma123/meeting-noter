import type { Gamut, Hex, LinearRGB, OKLab, OKLCH, RGB, XYZ } from "./types.js";
/** Below this chroma a colour is grey and its hue carries no information. */
export declare const CHROMA_EPSILON = 0.0001;
/** Normalise any angle into `[0, 360)`. */
export declare function normalizeHue(hue: number): number;
/**
 * Parse `#rgb` / `#rrggbb` (leading `#` optional) into 0-255 channels. The only
 * entry point that reads external text: it matches a strict pattern and throws
 * rather than coercing a partial parse.
 */
export declare function hexToRgb(hex: Hex): RGB;
export declare function rgbToHex(rgb: RGB): Hex;
export declare function srgbToLinear(rgb: RGB): LinearRGB;
export declare function linearToSrgb(rgb: LinearRGB): RGB;
export declare function linearRgbToXyz(rgb: LinearRGB, gamut?: Gamut): XYZ;
export declare function xyzToLinearRgb(xyz: XYZ, gamut?: Gamut): LinearRGB;
export declare function xyzToOklab(xyz: XYZ): OKLab;
export declare function oklabToXyz(lab: OKLab): XYZ;
export declare function oklabToOklch(lab: OKLab): OKLCH;
export declare function oklchToOklab(color: OKLCH): OKLab;
export declare function hexToOklch(hex: Hex): OKLCH;
/**
 * Convert to hex, rounding channels into 0-255. Out-of-gamut input is clamped by
 * that rounding, which shifts hue — call `gamutMap` first for anything that has
 * not been proven in gamut.
 */
export declare function oklchToHex(color: OKLCH, gamut?: Gamut): Hex;
/**
 * CSS `oklch(L C H)`. Trailing zeros are trimmed and an achromatic colour always
 * serialises with hue 0, so equivalent greys never produce differing output.
 */
export declare function formatOklch(color: OKLCH, options?: {
    precision?: number;
}): string;
