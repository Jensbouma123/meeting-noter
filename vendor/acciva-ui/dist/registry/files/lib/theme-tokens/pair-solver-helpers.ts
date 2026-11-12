import { evaluatePair, type ContrastReport, type ContrastUse, type Hex } from "@/lib/color/index";
import type { ContrastRoleCategory, RoleThresholdConfig } from "@/lib/theme-tokens/contrast-thresholds";

export type SolvedPairRoleResult = {
  readonly solvedHex: Hex;
  readonly cssVariable: string;
  readonly report: ContrastReport;
  readonly roleType: ContrastRoleCategory;
};

export const SAMPLES = 101;
const TIE = 1e-9;

export const clampL = (l: number): number => Math.min(1, Math.max(0, l));

export const createReport = (
  fg: Hex,
  bg: Hex,
  use: ContrastUse,
  targetConfig: RoleThresholdConfig["aa"],
): ContrastReport => {
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

export type Sample = {
  /** Clears the WCAG ratio — the gate, and the only thing `passes` means. */
  readonly gated: boolean;
  /** Clears the gate *and* the advisory APCA target. */
  readonly preferred: boolean;
  readonly ratio: number;
  readonly lc: number;
};

export type Nearest = { l: number | null; distance: number };

export const consider = (nearest: Nearest, l: number, distance: number, preferDarkerOnTie: boolean): void => {
  if (nearest.l === null || distance < nearest.distance - TIE) {
    nearest.l = l;
    nearest.distance = distance;
    return;
  }
  if (distance > nearest.distance + TIE) return;
  if (preferDarkerOnTie ? l < nearest.l : l > nearest.l) nearest.l = l;
};
