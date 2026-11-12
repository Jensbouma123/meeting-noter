import {
  apcaLc,
  apcaLevel,
  contrastRatio,
  wcagLevel,
  type ContrastReport,
  type ContrastUse,
} from "@/lib/color/contrast/index";
import type { Hex } from "@/lib/color/types";

export type ContrastTarget = { ratio: number; lc: number };

const LARGE_TEXT_TARGET_RATIO = 3;

function contrastUseForTarget(target: ContrastTarget): ContrastUse {
  const tier = apcaLevel(target.lc);
  return tier === "invisible" ? "decorative" : tier;
}

export function reportAgainst(
  fg: Hex,
  bg: Hex,
  target: ContrastTarget,
): ContrastReport {
  const ratio = contrastRatio(fg, bg);
  const lc = apcaLc(fg, bg);
  const wcagPasses = ratio >= target.ratio;
  const apcaPasses = Math.abs(lc) >= target.lc;

  return {
    foreground: fg,
    background: bg,
    use: contrastUseForTarget(target),
    wcag: {
      ratio,
      required: target.ratio,
      level: wcagLevel(ratio, target.ratio <= LARGE_TEXT_TARGET_RATIO),
      passes: wcagPasses,
    },
    apca: {
      lc,
      tier: apcaLevel(lc),
      required: target.lc,
      darkOnLight: lc > 0,
      passes: apcaPasses,
    },
    passes: wcagPasses && apcaPasses,
  };
}

/**
 * How far short of the target a pair falls, as the worse of the two engines'
 * achieved fractions. `>= 1` on both axes means the pair passes; below that,
 * a larger number is a nearer miss. Used only to pick the least-bad result
 * when no lightness on the axis can satisfy the target.
 */
export function shortfallScore(
  report: ContrastReport,
  target: ContrastTarget,
): number {
  const ratioScore =
    target.ratio <= 0
      ? Number.POSITIVE_INFINITY
      : report.wcag.ratio / target.ratio;
  const lcScore =
    target.lc <= 0
      ? Number.POSITIVE_INFINITY
      : Math.abs(report.apca.lc) / target.lc;
  return Math.min(ratioScore, lcScore);
}
