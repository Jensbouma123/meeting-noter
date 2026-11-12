import { apcaLc, contrastRatio, hexToOklch, oklchToHex, type Hex, type ThemeMode } from "@/lib/color/index";
import type { ThemeContrastPair } from "@/lib/theme-tokens/contrast-pairs";
import { ROLE_VARIABLES } from "@/lib/theme-tokens/roles";
import { SAMPLES, clampL, consider, createReport, type Nearest, type Sample, type SolvedPairRoleResult } from "@/lib/theme-tokens/pair-solver-helpers";

/**
 * Role-specific contrast solver. Adjusts the token (foreground text/border/focus
 * or background fill) by minimal OKLCH lightness shift, preserving hue and
 * chroma, until it clears the role's real threshold.
 *
 * The whole lightness axis is searched, both lighter and darker than where the
 * role starts, and the nearest passing lightness wins — the auto-constrain
 * guarantee is that a reachable pass is found, so a one-sided search that can
 * miss it is a bug, not a preference.
 *
 * The gate is the WCAG 2.2 ratio. Among the lightnesses that clear it the solver
 * prefers one that also meets the advisory APCA target, but when no such
 * lightness exists in gamut it returns the nearest ratio-clearing colour and
 * reports `apca.passes: false` — the ratio decides, and the report says so.
 * There is no lightness window that reports a pass a colour did not earn.
 */
export function solvePairForRole(
  pair: ThemeContrastPair,
  targetLevel: "AA" | "AAA" = "AA",
  mode: ThemeMode = pair.mode,
): SolvedPairRoleResult {
  const cssVariable = ROLE_VARIABLES[pair.id];
  const targetConfig = targetLevel === "AAA" ? pair.thresholds.aaa : pair.thresholds.aa;
  const isAdjustingForeground = pair.adjustableTarget === "foreground";

  const originColor = hexToOklch(isAdjustingForeground ? pair.foreground : pair.background);
  const fixedHex = isAdjustingForeground ? pair.background : pair.foreground;

  const initialFg = isAdjustingForeground ? pair.foreground : fixedHex;
  const initialBg = isAdjustingForeground ? fixedHex : pair.background;
  const initialRatio = contrastRatio(initialFg, initialBg);
  const initialLc = apcaLc(initialFg, initialBg);

  const unchanged = (): SolvedPairRoleResult => ({
    solvedHex: isAdjustingForeground ? pair.foreground : pair.background,
    cssVariable,
    report: createReport(initialFg, initialBg, pair.use, targetConfig),
    roleType: pair.category,
  });

  // An exempt role has no ratio to earn, so there is nothing to move it toward.
  if (pair.thresholds.criterion === null) return unchanged();

  // Already clears the gate with the advisory target to spare: leave it alone.
  if (initialRatio >= targetConfig.ratio && Math.abs(initialLc) >= targetConfig.lc) {
    return unchanged();
  }

  // Both halves of the lightness axis are searched, and the nearest passing
  // lightness wins. The colour still normally keeps the side of its counterpart
  // it already sits on — dark text stays dark, a light ring stays light —
  // because that side is where the nearest pass almost always lies. But it is
  // only *almost* always: once the engine has darkened an action fill, the dark
  // half below that fill can top out under the required ratio while the light
  // half clears it comfortably, so a search confined to the near half reported a
  // near-miss for a pass that was reachable. The mode is now only a tie-break
  // between two equally near passes — light mode reaches for the darker one.
  const preferDarkerOnTie = mode === "light";
  const originL = clampL(originColor.l);

  const at = (l: number): Sample => {
    const hex = oklchToHex({ l: clampL(l), c: originColor.c, h: originColor.h });
    const fg = isAdjustingForeground ? hex : fixedHex;
    const bg = isAdjustingForeground ? fixedHex : hex;
    const ratio = contrastRatio(fg, bg);
    const lc = apcaLc(fg, bg);
    const gated = ratio >= targetConfig.ratio;
    return { gated, preferred: gated && Math.abs(lc) >= targetConfig.lc, ratio, lc };
  };

  const nearestPreferred: Nearest = { l: null, distance: Number.POSITIVE_INFINITY };
  const nearestGated: Nearest = { l: null, distance: Number.POSITIVE_INFINITY };
  let bestEffortL = originL;
  let bestEffortScore = -1;

  for (let i = 0; i < SAMPLES; i += 1) {
    const l = i / (SAMPLES - 1);
    const res = at(l);
    const distance = Math.abs(l - originL);
    if (res.preferred) consider(nearestPreferred, l, distance, preferDarkerOnTie);
    if (res.gated) consider(nearestGated, l, distance, preferDarkerOnTie);
    if (!res.gated) {
      const score = Math.min(
        targetConfig.ratio <= 0 ? 1 : res.ratio / targetConfig.ratio,
        targetConfig.lc <= 0 ? 1 : Math.abs(res.lc) / targetConfig.lc,
      );
      if (score > bestEffortScore) {
        bestEffortScore = score;
        bestEffortL = l;
      }
    }
  }

  const finish = (hex: Hex): SolvedPairRoleResult => ({
    solvedHex: hex,
    cssVariable,
    report: createReport(
      isAdjustingForeground ? hex : fixedHex,
      isAdjustingForeground ? fixedHex : hex,
      pair.use,
      targetConfig,
    ),
    roleType: pair.category,
  });

  // Nothing in gamut on this hue and chroma line clears the ratio, in either
  // direction. Hand back the closest attempt; its report fails, which is the
  // honest answer.
  const gatedL = nearestGated.l;
  if (gatedL === null) {
    return finish(oklchToHex({ l: clampL(bestEffortL), c: originColor.c, h: originColor.h }));
  }

  const preferredL = nearestPreferred.l;
  const preferAdvisory = preferredL !== null;
  const meetsTarget = (sample: Sample): boolean =>
    preferAdvisory ? sample.preferred : sample.gated;

  let passing = preferredL ?? gatedL;

  // Bisect against the coarse sample one step *inside* the winning one, so the
  // bracket never spans the counterpart's own lightness — where contrast turns
  // around and a bisection would have no single crossing to find.
  const coarseStep = 1 / (SAMPLES - 1);
  const towardOrigin = Math.sign(originL - passing);
  let failing = towardOrigin === 0 ? originL : clampL(passing + towardOrigin * coarseStep);
  if (Math.abs(failing - originL) > Math.abs(passing - originL)) failing = originL;

  if (!meetsTarget(at(failing))) {
    for (let i = 0; i < 24 && Math.abs(passing - failing) > 1e-5; i += 1) {
      const mid = (passing + failing) / 2;
      if (meetsTarget(at(mid))) {
        passing = mid;
      } else {
        failing = mid;
      }
    }
  } else {
    passing = failing;
  }

  return finish(oklchToHex({ l: clampL(passing), c: originColor.c, h: originColor.h }));
}
