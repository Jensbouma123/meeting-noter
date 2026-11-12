import { oklchToHex } from "@/lib/color/space/index";
import { apcaLc, contrastRatio } from "@/lib/color/contrast/index";
import type { Hex, PaletteName, SemanticRampSet, SurfaceScale } from "@/lib/color/types";
import { entryToRole, nearestByLightness, rampEntries, type RampEntry } from "@/lib/color/semantic/ramp-entries";
import { solvedEntry, type RoleConstraint } from "@/lib/color/semantic/solver";
import type { SemanticRole } from "@/lib/color/semantic/types";

/** A role whose only requirement is the designer's lightness intent. */
export function role(
  ramps: SemanticRampSet,
  palette: PaletteName,
  targetL: number,
  description: string,
): SemanticRole {
  return entryToRole(palette, nearestByLightness(ramps[palette], targetL), description);
}

/** A role the AA gate constrains: the nearest step to intent that conforms. */
export function gatedRole(
  ramps: SemanticRampSet,
  palette: PaletteName,
  targetL: number,
  description: string,
  required: readonly RoleConstraint[],
  preferred: readonly RoleConstraint[] = [],
): SemanticRole {
  return entryToRole(
    palette,
    solvedEntry(ramps[palette], targetL, required, preferred),
    description,
  );
}

export function surfaceRole(surface: SurfaceScale, targetL: number, description: string): SemanticRole {
  return entryToRole("surface", nearestByLightness(surface, targetL), description);
}

export function gatedSurfaceRole(
  surface: SurfaceScale,
  targetL: number,
  description: string,
  required: readonly RoleConstraint[],
): SemanticRole {
  return entryToRole("surface", solvedEntry(surface, targetL, required), description);
}

export function hexOf(semanticRole: SemanticRole): Hex {
  return oklchToHex(semanticRole.color);
}

/**
 * Picks the neutral step — lightest or darkest available — that reads best on
 * `background`. WCAG 2.1 ratio decides, |Lc| breaks ties, so both engines gate
 * the choice.
 */
export function onColorRole(
  ramps: SemanticRampSet,
  background: SemanticRole,
  description: string,
): SemanticRole {
  const entries = rampEntries(ramps.neutral);
  const darkest = entries[0] as RampEntry;
  const lightest = entries[entries.length - 1] as RampEntry;
  const backgroundHex = oklchToHex(background.color);
  const candidates = [darkest, lightest].map((entry) => {
    const hex = oklchToHex(entry.color);
    return {
      entry,
      ratio: contrastRatio(hex, backgroundHex),
      lc: Math.abs(apcaLc(hex, backgroundHex)),
    };
  });
  const [first, second] = candidates as [
    (typeof candidates)[number],
    (typeof candidates)[number],
  ];
  const winner =
    second.ratio > first.ratio ||
    (second.ratio === first.ratio && second.lc > first.lc)
      ? second
      : first;
  return entryToRole("neutral", winner.entry, description);
}
