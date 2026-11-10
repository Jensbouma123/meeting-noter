import { type ContrastReport, type ContrastUse, type Hex, type ThemeMode } from "../color/index.js";
import type { AppTheme } from "./app-theme.js";
import { type PairSpec } from "./contrast-pair-specs.js";
import { type AdjustableTarget, type ContrastRoleCategory, type ContrastVerdict, type RoleThresholdConfig } from "./contrast-thresholds.js";
import { type SolvableRole } from "./roles.js";
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
export declare function pairFromSpec(spec: PairSpec, theme: AppTheme): ThemeContrastPair;
export declare function themeContrastPairs(theme: AppTheme): ThemeContrastPair[];
