import type { Hex, LinearRGB, RGB } from "../types.js";
/**
 * sRGB electro-optical transfer function, sign-preserving so out-of-gamut
 * candidates survive the round trip instead of folding onto themselves.
 * Display-P3 shares this curve; only the primaries differ.
 */
export declare function decodeChannel(value: number): number;
export declare function encodeChannel(value: number): number;
/**
 * Parse `#rgb` / `#rrggbb` (leading `#` optional) into 0-255 channels. The only
 * entry point that reads external text: it matches a strict pattern and throws
 * rather than coercing a partial parse.
 */
export declare function hexToRgb(hex: Hex): RGB;
export declare function rgbToHex(rgb: RGB): Hex;
export declare function srgbToLinear(rgb: RGB): LinearRGB;
export declare function linearToSrgb(rgb: LinearRGB): RGB;
