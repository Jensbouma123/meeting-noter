import { applyThemeOverrides } from "./apply-overrides.js";
import { PAIR_SPECS } from "./contrast-pair-specs.js";
import { pairFromSpec } from "./contrast-pairs.js";
import { autoFixSeedForContrast } from "./seed-fix.js";
import { solvePairForRole } from "./pair-solver.js";
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
export function solveAllContrastPairs(theme, target = "AA") {
    let current = theme;
    return PAIR_SPECS.map((spec) => {
        const pair = pairFromSpec(spec, current);
        const solved = solvePairForRole(pair, target, theme.mode);
        current = applyThemeOverrides(current, { [solved.cssVariable]: solved.solvedHex });
        return {
            id: pair.id,
            label: pair.label,
            originalFg: pair.foreground,
            solvedFg: solved.solvedHex,
            report: solved.report,
            category: pair.category,
            cssVariable: solved.cssVariable,
            verdict: pair.thresholds.criterion === null ? "exempt" : solved.report.passes ? "pass" : "fail",
        };
    });
}
/**
 * Derives both the contrast-fixed seed and solutions for all failing pairs in the theme.
 */
export function autoFixTheme(theme, target = "AA") {
    const seedFix = autoFixSeedForContrast(theme.seed, target);
    const pairSolutionsList = solveAllContrastPairs(theme, target);
    const pairSolutions = {};
    for (const sol of pairSolutionsList) {
        pairSolutions[sol.id] = { hex: sol.solvedFg, report: sol.report, cssVariable: sol.cssVariable };
    }
    return {
        fixedSeed: seedFix.seed,
        pairSolutions,
    };
}
