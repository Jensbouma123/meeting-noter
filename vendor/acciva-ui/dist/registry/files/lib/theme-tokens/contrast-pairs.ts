import { contrastRatio, evaluatePair, type ContrastReport, type ContrastUse, type Hex, type ThemeMode } from "@/lib/color/index";
import type { AppTheme } from "@/lib/theme-tokens/app-theme";
import { PAIR_SPECS, type PairSpec } from "@/lib/theme-tokens/contrast-pair-specs";
import {
  ROLE_THRESHOLDS,
  type AdjustableTarget,
  type ContrastRoleCategory,
  type ContrastVerdict,
  type RoleThresholdConfig,
} from "@/lib/theme-tokens/contrast-thresholds";
import { ROLE_VARIABLES, type SolvableRole } from "@/lib/theme-tokens/roles";

/**
 * The pairs a generated theme is held to. Both engines are reported, but only
 * the WCAG 2.2 ratio is the gate: `report.passes` and `verdict` are decided by
 * `wcag.ratio` alone, and APCA is advisory — it can neither rescue a pair whose
 * ratio falls short nor be waived to let one through.
 */
export type ThemeContrastPair = {
  readonly id: SolvableRole;
  readonly label: string;
  readonly mode: ThemeMode;
  readonly use: ContrastUse;
  readonly category: ContrastRoleCategory;
  readonly adjustableTarget: AdjustableTarget;
  readonly thresholds: RoleThresholdConfig;
  /** The one property solving this pair writes. Unique across the pair set. */
  readonly cssVariable: string;
  /**
   * What to render for this pair. Read this rather than `report.passes`: an
   * exempt role has a required ratio of 0, which `report.passes` satisfies
   * trivially and which must not be shown as a pass it earned.
   */
  readonly verdict: ContrastVerdict;
  readonly foreground: Hex;
  readonly background: Hex;
  readonly report: ContrastReport;
};

export function pairFromSpec(spec: PairSpec, theme: AppTheme): ThemeContrastPair {
  const [foreground, background] = spec.pick(theme);
  const thresholds = ROLE_THRESHOLDS[spec.category];
  const baseReport = evaluatePair(foreground, background, spec.use);

  const ratio = baseReport.wcag.ratio;
  const lc = baseReport.apca.lc;
  // The ratio is the gate. APCA is carried alongside it as a quality signal and
  // is deliberately absent from `passes`: it may not rescue a short ratio, and
  // no category may waive the ratio to reach a pass.
  const wcagPasses = ratio >= thresholds.aa.ratio;
  const apcaPasses = Math.abs(lc) >= thresholds.aa.lc;

  const report: ContrastReport = {
    ...baseReport,
    wcag: {
      ...baseReport.wcag,
      required: thresholds.aa.ratio,
      passes: wcagPasses,
    },
    apca: {
      ...baseReport.apca,
      required: thresholds.aa.lc,
      passes: apcaPasses,
    },
    passes: wcagPasses,
  };
  return {
    id: spec.id,
    label: spec.label,
    mode: theme.mode,
    use: spec.use,
    category: spec.category,
    adjustableTarget: spec.adjustableTarget,
    thresholds,
    cssVariable: ROLE_VARIABLES[spec.id],
    verdict: thresholds.criterion === null ? "exempt" : wcagPasses ? "pass" : "fail",
    foreground,
    background,
    report,
  };
}

export function themeContrastPairs(theme: AppTheme): ThemeContrastPair[] {
  return PAIR_SPECS.map((spec) => pairFromSpec(spec, theme));
}
