import { oklchToHex } from "../space/index.js";
import { apcaLc, contrastRatio } from "../contrast/index.js";
import { entryToRole, nearestByLightness, rampEntries } from "./ramp-entries.js";
import { solvedEntry } from "./solver.js";
/** A role whose only requirement is the designer's lightness intent. */
export function role(ramps, palette, targetL, description) {
    return entryToRole(palette, nearestByLightness(ramps[palette], targetL), description);
}
/** A role the AA gate constrains: the nearest step to intent that conforms. */
export function gatedRole(ramps, palette, targetL, description, required, preferred = []) {
    return entryToRole(palette, solvedEntry(ramps[palette], targetL, required, preferred), description);
}
export function surfaceRole(surface, targetL, description) {
    return entryToRole("surface", nearestByLightness(surface, targetL), description);
}
export function gatedSurfaceRole(surface, targetL, description, required) {
    return entryToRole("surface", solvedEntry(surface, targetL, required), description);
}
export function hexOf(semanticRole) {
    return oklchToHex(semanticRole.color);
}
/**
 * Picks the neutral step — lightest or darkest available — that reads best on
 * `background`. WCAG 2.1 ratio decides, |Lc| breaks ties, so both engines gate
 * the choice.
 */
export function onColorRole(ramps, background, description) {
    const entries = rampEntries(ramps.neutral);
    const darkest = entries[0];
    const lightest = entries[entries.length - 1];
    const backgroundHex = oklchToHex(background.color);
    const candidates = [darkest, lightest].map((entry) => {
        const hex = oklchToHex(entry.color);
        return {
            entry,
            ratio: contrastRatio(hex, backgroundHex),
            lc: Math.abs(apcaLc(hex, backgroundHex)),
        };
    });
    const [first, second] = candidates;
    const winner = second.ratio > first.ratio ||
        (second.ratio === first.ratio && second.lc > first.lc)
        ? second
        : first;
    return entryToRole("neutral", winner.entry, description);
}
