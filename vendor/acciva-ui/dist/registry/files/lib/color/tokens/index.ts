import { hexToOklch } from "@/lib/color/space/index";
import { buildSemanticRoles, buildSurfaceScale } from "@/lib/color/semantic/index";
import type { Gamut, HarmonyMode, Hex, PaletteName } from "@/lib/color/types";
import type { DtcgDocument, DtcgGroup, DtcgToken, TokenGraphOptions } from "@/lib/color/tokens/types";
import { buildRampSet, scaleToGroup } from "@/lib/color/tokens/primitives";
import { rolesToGroup } from "@/lib/color/tokens/semantic-groups";
import { componentGroup } from "@/lib/color/tokens/component-tokens";

export type { DtcgDocument, DtcgGroup, DtcgToken, TokenGraphOptions } from "@/lib/color/tokens/types";

const DEFAULT_PRECISION = 4;

export function isDtcgToken(node: DtcgGroup | DtcgToken): node is DtcgToken {
  return "$value" in node;
}

/**
 * Builds the three-layer W3C DTCG 2025.10 graph for a seed colour: primitive
 * ramps hold literal `oklch()` values, semantic roles alias primitives per
 * mode, and component tokens alias semantic roles only.
 */
export function buildTokenGraph(seed: Hex, opts: TokenGraphOptions = {}): DtcgDocument {
  const gamut: Gamut = opts.gamut ?? "srgb";
  const harmony: HarmonyMode = opts.harmony ?? "complementary";
  const precision = opts.precision ?? DEFAULT_PRECISION;
  const seedOklch = hexToOklch(seed);
  const ramps = buildRampSet(seedOklch, gamut, harmony);
  const surface = buildSurfaceScale(seedOklch.h);

  const primitive: Record<string, DtcgGroup> = { surface: scaleToGroup(surface, "surface", precision) };
  for (const palette of Object.keys(ramps) as PaletteName[]) {
    primitive[palette] = scaleToGroup(ramps[palette], palette, precision);
  }

  return {
    $description: `OKLCH theme generated from seed ${seed} (${harmony} harmony, ${gamut} gamut)`,
    color: {
      primitive,
      semantic: {
        light: rolesToGroup(buildSemanticRoles(ramps, "light", surface)),
        dark: rolesToGroup(buildSemanticRoles(ramps, "dark", surface)),
      },
      component: {
        light: componentGroup("light"),
        dark: componentGroup("dark"),
      },
    },
  };
}
