import type { ContrastReport, Hex } from "@/lib/color/index";
import { applyThemeOverrides } from "@/lib/theme-tokens/apply-overrides";
import type { AppTheme } from "@/lib/theme-tokens/app-theme";
import { PAIR_SPECS } from "@/lib/theme-tokens/contrast-pair-specs";
import { pairFromSpec } from "@/lib/theme-tokens/contrast-pairs";
import type { ContrastRoleCategory, ContrastVerdict } from "@/lib/theme-tokens/contrast-thresholds";
import { autoFixSeedForContrast } from "@/lib/theme-tokens/seed-fix";
import type { SolvableRole } from "@/lib/theme-tokens/roles";
import { solvePairForRole } from "@/lib/theme-tokens/pair-solver";

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
export function solveAllContrastPairs(
  theme: AppTheme,
  target: "AA" | "AAA" = "AA",
): ContrastPairSolution[] {
  let current = theme;
  return PAIR_SPECS.map((spec): ContrastPairSolution => {
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
      verdict:
        pair.thresholds.criterion === null ? "exempt" : solved.report.passes ? "pass" : "fail",
    };
  });
}

export type AutoFixThemeResult = {
  readonly fixedSeed: Hex;
  readonly pairSolutions: Record<string, { hex: Hex; report: ContrastReport; cssVariable: string }>;
};

/**
 * Derives both the contrast-fixed seed and solutions for all failing pairs in the theme.
 */
export function autoFixTheme(
  theme: AppTheme,
  target: "AA" | "AAA" = "AA",
): {
  fixedSeed: Hex;
  pairSolutions: Record<string, { hex: Hex; report: ContrastReport; cssVariable: string }>;
} {
  const seedFix = autoFixSeedForContrast(theme.seed, target);
  const pairSolutionsList = solveAllContrastPairs(theme, target);
  const pairSolutions: Record<string, { hex: Hex; report: ContrastReport; cssVariable: string }> = {};
  for (const sol of pairSolutionsList) {
    pairSolutions[sol.id] = { hex: sol.solvedFg, report: sol.report, cssVariable: sol.cssVariable };
  }
  return {
    fixedSeed: seedFix.seed,
    pairSolutions,
  };
}
