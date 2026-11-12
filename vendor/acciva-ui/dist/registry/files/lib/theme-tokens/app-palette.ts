import {
  buildRamp,
  buildSemanticRoles,
  buildTokenGraph,
  flattenDocument,
  harmonize,
  hexToOklch,
  type DtcgDocument,
  type HarmonyMode,
  type Hex,
  type OKLCH,
  type Ramp,
  type SemanticRampSet,
  type SemanticRoles,
  type StepLabel,
  type SurfaceScale,
  type ThemeMode,
} from "@/lib/color/index";
import {
  DEFAULT_HARMONY,
  type AppPaletteName,
  type ShadeScale,
  type StatusPaletteName,
  type TailwindStep,
} from "@/lib/theme-tokens/constants";
import { resolveAliases, shadeScale } from "@/lib/theme-tokens/aliases";

/**
 * Reads the graph's primitive ramps back out of the flattened document rather
 * than rebuilding them, so the JS values and the exported CSS can never drift.
 */
function primitiveScales(doc: DtcgDocument): Record<string, Record<StepLabel, OKLCH>> {
  const scales: Record<string, Record<StepLabel, OKLCH>> = {};
  for (const token of flattenDocument(doc).primitive) {
    const palette = token.path[2];
    const step = token.path[3];
    if (palette === undefined || step === undefined) continue;
    const scale = scales[palette] ?? {};
    scale[Number(step)] = token.color;
    scales[palette] = scale;
  }
  return scales;
}

/**
 * The app carries three brand hues (60-30-10) but a harmony can hand back only
 * one partner. `accent` is the graph's own partner — the complement, or the
 * first rotation the mode defines — and `secondary` is the most-rotated
 * remaining variant, falling back to the +30 degree analogous neighbour when the
 * harmony has nothing else to give.
 */
function secondarySeedFor(seed: OKLCH, harmony: HarmonyMode): OKLCH {
  const partners = harmonize(seed, harmony).slice(1);
  if (partners.length > 1) return partners[partners.length - 1] as OKLCH;
  return (harmonize(seed, "analogous")[2] ?? seed) as OKLCH;
}

export type AppPalette = {
  readonly seed: Hex;
  readonly harmony: HarmonyMode;
  readonly document: DtcgDocument;
  readonly ramps: Readonly<Record<AppPaletteName | StatusPaletteName, Ramp>>;
  readonly scales: Readonly<Record<AppPaletteName | StatusPaletteName, ShadeScale>>;
  readonly aliases: Readonly<Record<TailwindStep, StepLabel>>;
  readonly roles: Readonly<Record<ThemeMode, SemanticRoles>>;
};

/**
 * The expensive half of a theme: seven gamut-mapped ramps and both modes' role
 * tables. Independent of the active mode, so a light/dark toggle never rebuilds
 * it (`.agents/performance.md`).
 */
export function buildAppPalette(seed: Hex, harmony: HarmonyMode = DEFAULT_HARMONY): AppPalette {
  const document = buildTokenGraph(seed, { harmony });
  const scales = primitiveScales(document);
  const rampSet: SemanticRampSet = {
    brand: scales.brand as Ramp,
    accent: scales.accent as Ramp,
    neutral: scales.neutral as Ramp,
    success: scales.success as Ramp,
    warning: scales.warning as Ramp,
    danger: scales.danger as Ramp,
    info: scales.info as Ramp,
  };
  const surface = scales.surface as SurfaceScale;

  const ramps: Record<AppPaletteName | StatusPaletteName, Ramp> = {
    primary: rampSet.brand,
    secondary: buildRamp(secondarySeedFor(hexToOklch(seed), harmony)),
    accent: rampSet.accent,
    neutral: rampSet.neutral,
    success: rampSet.success,
    warning: rampSet.warning,
    danger: rampSet.danger,
    info: rampSet.info,
  };
  const aliases = resolveAliases(ramps.primary);

  return {
    seed,
    harmony,
    document,
    ramps,
    aliases,
    scales: {
      primary: shadeScale(ramps.primary, aliases),
      secondary: shadeScale(ramps.secondary, aliases),
      accent: shadeScale(ramps.accent, aliases),
      neutral: shadeScale(ramps.neutral, aliases),
      success: shadeScale(ramps.success, aliases),
      warning: shadeScale(ramps.warning, aliases),
      danger: shadeScale(ramps.danger, aliases),
      info: shadeScale(ramps.info, aliases),
    },
    roles: {
      light: buildSemanticRoles(rampSet, "light", surface),
      dark: buildSemanticRoles(rampSet, "dark", surface),
    },
  };
}
