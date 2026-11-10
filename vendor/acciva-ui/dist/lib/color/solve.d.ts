/**
 * Contrast solver. Given a foreground and a background in OKLCH, walk the
 * foreground's lightness — and only its lightness — until the pair clears both
 * the WCAG 2.1 ratio and the APCA |Lc| target. Hue and chroma are held
 * constant so a solved colour still reads as the same colour.
 *
 * Lightness is the only free axis on purpose: moving hue breaks harmony, and
 * moving chroma desaturates brand colours out from under the caller. OKLCH
 * lightness is perceptually uniform, so the walk is monotonic in contrast for
 * a fixed hue/chroma and a coarse-scan-then-bisect search converges tightly.
 */
import type { ContrastReport } from "./contrast/index.js";
import { type ContrastTarget } from "./solveReport.js";
import type { OKLCH } from "./types.js";
export type { ContrastTarget } from "./solveReport.js";
export type ContrastSolution = {
    color: OKLCH;
    report: ContrastReport;
    converged: boolean;
};
/**
 * Walk `fg`'s lightness until the pair clears `target` on both engines,
 * preferring the smallest lightness change that works so the solved colour
 * stays as close to the caller's intent as possible.
 *
 * `converged` is `false` when no lightness in [0, 1] satisfies the target —
 * the chroma is too high or the target too aggressive for this hue. The
 * returned colour is then the best pair found, and `report.passes` is `false`;
 * callers must not treat that as a pass.
 */
export declare function adjustForContrast(fg: OKLCH, bg: OKLCH, target: ContrastTarget): ContrastSolution;
