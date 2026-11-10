import type { ApcaTier, ContrastUse } from "./thresholds.js";
import type { WcagLevel } from "./wcag.js";
import type { Hex } from "../types.js";
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
