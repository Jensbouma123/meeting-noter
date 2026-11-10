import type { Hex } from "../types.js";
/**
 * APCA lightness contrast Lc, signed and polarity-aware.
 * Positive = dark text on a light background; negative = light text on a dark
 * background. Range is roughly -108..+106; 0 means below the reportable floor.
 * The scale is perceptual, not a ratio — never compare it to a WCAG number.
 */
export declare function apcaLc(textHex: Hex, bgHex: Hex): number;
