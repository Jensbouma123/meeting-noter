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
