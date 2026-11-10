import { type ContrastReport } from "./contrast/index.js";
import type { Hex } from "./types.js";
export type ContrastTarget = {
    ratio: number;
    lc: number;
};
export declare function reportAgainst(fg: Hex, bg: Hex, target: ContrastTarget): ContrastReport;
/**
 * How far short of the target a pair falls, as the worse of the two engines'
 * achieved fractions. `>= 1` on both axes means the pair passes; below that,
 * a larger number is a nearer miss. Used only to pick the least-bad result
 * when no lightness on the axis can satisfy the target.
 */
export declare function shortfallScore(report: ContrastReport, target: ContrastTarget): number;
