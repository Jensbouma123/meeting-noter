import { type ContrastReport, type ContrastUse, type Hex } from "../color/index.js";
import type { ContrastRoleCategory, RoleThresholdConfig } from "./contrast-thresholds.js";
export type SolvedPairRoleResult = {
    readonly solvedHex: Hex;
    readonly cssVariable: string;
    readonly report: ContrastReport;
    readonly roleType: ContrastRoleCategory;
};
export declare const SAMPLES = 101;
export declare const clampL: (l: number) => number;
export declare const createReport: (fg: Hex, bg: Hex, use: ContrastUse, targetConfig: RoleThresholdConfig["aa"]) => ContrastReport;
export type Sample = {
    /** Clears the WCAG ratio — the gate, and the only thing `passes` means. */
    readonly gated: boolean;
    /** Clears the gate *and* the advisory APCA target. */
    readonly preferred: boolean;
    readonly ratio: number;
    readonly lc: number;
};
export type Nearest = {
    l: number | null;
    distance: number;
};
export declare const consider: (nearest: Nearest, l: number, distance: number, preferDarkerOnTie: boolean) => void;
