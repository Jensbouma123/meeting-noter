import type { Gamut, Hex, OKLCH } from "../types.js";
export declare function hexToOklch(hex: Hex): OKLCH;
/**
 * Convert to hex, rounding channels into 0-255. Out-of-gamut input is clamped by
 * that rounding, which shifts hue — call `gamutMap` first for anything that has
 * not been proven in gamut.
 */
export declare function oklchToHex(color: OKLCH, gamut?: Gamut): Hex;
