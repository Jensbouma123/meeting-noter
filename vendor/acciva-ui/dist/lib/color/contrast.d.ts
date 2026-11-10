/**
 * Dual contrast engines: WCAG 2.1 relative-luminance ratio and APCA (WCAG 3
 * draft) signed lightness contrast. A semantic pair passes only when BOTH
 * gates pass — see {@link evaluatePair}.
 *
 * WCAG 2.1 gamma expansion, luminance weights and the ratio formula follow
 * `.agents`-level spec section 5 (WCAG 2.1 SC 1.4.3 / 1.4.6 / 1.4.11).
 *
 * APCA constants are the SA98G G-series set for APCA-W3 0.1.9, transcribed
 * from https://github.com/Myndex/apca-w3 (`src/apca-w3.js`, the `SA98G`
 * object and `sRGBtoY` / `APCAcontrast`). Do not "simplify" or re-derive
 * them: every published Lc value depends on these exact numbers.
 */
import type { Hex } from "./types.js";
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
/**
 * APCA lightness contrast Lc, signed and polarity-aware.
 * Positive = dark text on a light background; negative = light text on a dark
 * background. Range is roughly -108..+106; 0 means below the reportable floor.
 * The scale is perceptual, not a ratio — never compare it to a WCAG number.
 */
export declare function apcaLc(textHex: Hex, bgHex: Hex): number;
/**
 * Intended use of a foreground/background pair. Determines both the APCA |Lc|
 * target and the WCAG ratio the pair is held to.
 */
export type ContrastUse = "body-preferred" | "body" | "non-body" | "large" | "ui" | "decorative";
/** Minimum |Lc| required per use, APCA bronze-tier lookup. */
export declare const APCA_THRESHOLDS: Readonly<Record<ContrastUse, number>>;
/** Minimum WCAG 2.1 AA ratio required per use. */
export declare const WCAG_THRESHOLDS: Readonly<Record<ContrastUse, number>>;
/** The highest use an achieved |Lc| supports. `"invisible"` is below the 15 cutoff. */
export type ApcaTier = ContrastUse | "invisible";
/** Highest APCA tier a signed Lc qualifies for. Polarity-independent. */
export declare function apcaLevel(lc: number): ApcaTier;
export type ContrastReport = {
    foreground: Hex;
    background: Hex;
    use: ContrastUse;
    wcag: {
        ratio: number;
        required: number;
        level: WcagLevel;
        passes: boolean;
    };
    apca: {
        lc: number;
        tier: ApcaTier;
        required: number;
        /** `true` when the pair is dark-on-light (positive Lc). */
        darkOnLight: boolean;
        passes: boolean;
    };
    /** Both engines pass. This is the only gate callers should branch on. */
    passes: boolean;
};
/**
 * Grade a foreground/background pair against both engines for a given use.
 * `passes` is the AND of the two — a pair is only usable when WCAG 2.1 AA and
 * the APCA |Lc| target are both satisfied.
 */
export declare function evaluatePair(fg: Hex, bg: Hex, use: ContrastUse): ContrastReport;
