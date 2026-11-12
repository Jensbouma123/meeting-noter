import { apcaLc } from "@/lib/color/contrast/apca";
import {
  APCA_THRESHOLDS,
  WCAG_THRESHOLDS,
  apcaLevel,
} from "@/lib/color/contrast/thresholds";
import type { ApcaTier, ContrastUse } from "@/lib/color/contrast/thresholds";
import { contrastRatio, wcagLevel } from "@/lib/color/contrast/wcag";
import type { WcagLevel } from "@/lib/color/contrast/wcag";
import type { Hex } from "@/lib/color/types";

/** Uses whose WCAG floor is the large-text / non-text scale rather than body. */
const LARGE_TEXT_USES: ReadonlySet<ContrastUse> = new Set<ContrastUse>([
  "large",
  "ui",
  "decorative",
]);

export type ContrastReport = {
  foreground: Hex;
  background: Hex;
  use: ContrastUse;
  wcag: {
    ratio: number;
    required: number;
    level: WcagLevel;
    passes: boolean;
  };
  apca: {
    lc: number;
    tier: ApcaTier;
    required: number;
    /** `true` when the pair is dark-on-light (positive Lc). */
    darkOnLight: boolean;
    passes: boolean;
  };
  /** Both engines pass. This is the only gate callers should branch on. */
  passes: boolean;
};

/**
 * Grade a foreground/background pair against both engines for a given use.
 * `passes` is the AND of the two — a pair is only usable when WCAG 2.1 AA and
 * the APCA |Lc| target are both satisfied.
 */
export function evaluatePair(
  fg: Hex,
  bg: Hex,
  use: ContrastUse,
): ContrastReport {
  const ratio = contrastRatio(fg, bg);
  const requiredRatio = WCAG_THRESHOLDS[use];
  const level = wcagLevel(ratio, LARGE_TEXT_USES.has(use));

  const lc = apcaLc(fg, bg);
  const requiredLc = APCA_THRESHOLDS[use];

  const wcagPasses = ratio >= requiredRatio;
  const apcaPasses = Math.abs(lc) >= requiredLc;

  return {
    foreground: fg,
    background: bg,
    use,
    wcag: { ratio, required: requiredRatio, level, passes: wcagPasses },
    apca: {
      lc,
      tier: apcaLevel(lc),
      required: requiredLc,
      darkOnLight: lc > 0,
      passes: apcaPasses,
    },
    passes: wcagPasses && apcaPasses,
  };
}
