import type { ContrastReport, Hex } from "../color/index.js";
import type { AppTheme } from "./app-theme.js";
import type { ContrastRoleCategory, ContrastVerdict } from "./contrast-thresholds.js";
import type { SolvableRole } from "./roles.js";
export type ContrastPairSolution = {
    readonly id: SolvableRole;
    readonly label: string;
    readonly originalFg: Hex;
    readonly solvedFg: Hex;
    readonly report: ContrastReport;
    readonly category: ContrastRoleCategory;
    readonly cssVariable: string;
    readonly verdict: ContrastVerdict;
};
/**
 * Solves all semantic contrast pairs in a theme according to their context and
 * role. Every solution names a different `cssVariable`, so the whole set can be
 * committed as one override map without any two entries fighting.
 *
 * Each fix is folded into the theme before the next pair is read, so a pair
 * measured against a role that was just solved — the focus ring against the
 * action fill, say — is graded against the fill it will actually sit on rather
 * than the one it started from.
 */
export declare function solveAllContrastPairs(theme: AppTheme, target?: "AA" | "AAA"): ContrastPairSolution[];
export type AutoFixThemeResult = {
    readonly fixedSeed: Hex;
    readonly pairSolutions: Record<string, {
        hex: Hex;
        report: ContrastReport;
        cssVariable: string;
    }>;
};
/**
 * Derives both the contrast-fixed seed and solutions for all failing pairs in the theme.
 */
export declare function autoFixTheme(theme: AppTheme, target?: "AA" | "AAA"): {
    fixedSeed: Hex;
    pairSolutions: Record<string, {
        hex: Hex;
        report: ContrastReport;
        cssVariable: string;
    }>;
};
