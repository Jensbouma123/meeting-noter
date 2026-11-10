import type { OKLab, OKLCH } from "../types.js";
/** Below this chroma a colour is grey and its hue carries no information. */
export declare const CHROMA_EPSILON = 0.0001;
/** Normalise any angle into `[0, 360)`. */
export declare function normalizeHue(hue: number): number;
export declare function oklabToOklch(lab: OKLab): OKLCH;
export declare function oklchToOklab(color: OKLCH): OKLab;
/**
 * CSS `oklch(L C H)`. Trailing zeros are trimmed and an achromatic colour always
 * serialises with hue 0, so equivalent greys never produce differing output.
 */
export declare function formatOklch(color: OKLCH, options?: {
    precision?: number;
}): string;
