import { apcaLc } from "./apca.js";
import { APCA_THRESHOLDS, WCAG_THRESHOLDS, apcaLevel, } from "./thresholds.js";
import { contrastRatio, wcagLevel } from "./wcag.js";
/** Uses whose WCAG floor is the large-text / non-text scale rather than body. */
const LARGE_TEXT_USES = new Set([
    "large",
    "ui",
    "decorative",
]);
/**
 * Grade a foreground/background pair against both engines for a given use.
 * `passes` is the AND of the two — a pair is only usable when WCAG 2.1 AA and
 * the APCA |Lc| target are both satisfied.
 */
export function evaluatePair(fg, bg, use) {
    const ratio = contrastRatio(fg, bg);
    const requiredRatio = WCAG_THRESHOLDS[use];
    const level = wcagLevel(ratio, LARGE_TEXT_USES.has(use));
    const lc = apcaLc(fg, bg);
    const requiredLc = APCA_THRESHOLDS[use];
    const wcagPasses = ratio >= requiredRatio;
    const apcaPasses = Math.abs(lc) >= requiredLc;
    return {
        foreground: fg,
        background: bg,
        use,
        wcag: { ratio, required: requiredRatio, level, passes: wcagPasses },
        apca: {
            lc,
            tier: apcaLevel(lc),
            required: requiredLc,
            darkOnLight: lc > 0,
            passes: apcaPasses,
        },
        passes: wcagPasses && apcaPasses,
    };
}
