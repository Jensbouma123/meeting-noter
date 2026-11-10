import type { Hex } from "../types.js";
export declare const WCAG_LINEAR_THRESHOLD = 0.04045;
export declare const WCAG_LINEAR_DIVISOR = 12.92;
export declare const WCAG_GAMMA_OFFSET = 0.055;
export declare const WCAG_GAMMA_SCALE = 1.055;
export declare const WCAG_GAMMA_EXPONENT = 2.4;
export declare const WCAG_FLARE = 0.05;
export declare const WCAG_AA_NORMAL_TEXT_RATIO = 4.5;
/** WCAG 2.1 relative luminance Y of an `#rrggbb` colour, 0 (black) to 1 (white). */
export declare function relativeLuminance(hex: Hex): number;
/** WCAG 2.1 contrast ratio, 1:1 to 21:1. Order-independent. */
export declare function contrastRatio(a: Hex, b: Hex): number;
export type WcagLevel = "AAA" | "AA" | "Fail";
/**
 * WCAG 2.1 conformance level for a ratio. `largeText` switches to the
 * SC 1.4.3 large-text scale (>=18.66px bold or >=24px regular), which is also
 * the SC 1.4.11 non-text scale.
 */
export declare function wcagLevel(ratio: number, largeText?: boolean): WcagLevel;
