import { evaluatePair } from "../color/index.js";
export const SAMPLES = 101;
const TIE = 1e-9;
export const clampL = (l) => Math.min(1, Math.max(0, l));
export const createReport = (fg, bg, use, targetConfig) => {
    const base = evaluatePair(fg, bg, use);
    const wcagPasses = base.wcag.ratio >= targetConfig.ratio;
    const apcaPasses = Math.abs(base.apca.lc) >= targetConfig.lc;
    return {
        ...base,
        wcag: {
            ...base.wcag,
            required: targetConfig.ratio,
            passes: wcagPasses,
        },
        apca: {
            ...base.apca,
            required: targetConfig.lc,
            passes: apcaPasses,
        },
        passes: wcagPasses,
    };
};
export const consider = (nearest, l, distance, preferDarkerOnTie) => {
    if (nearest.l === null || distance < nearest.distance - TIE) {
        nearest.l = l;
        nearest.distance = distance;
        return;
    }
    if (distance > nearest.distance + TIE)
        return;
    if (preferDarkerOnTie ? l < nearest.l : l > nearest.l)
        nearest.l = l;
};
