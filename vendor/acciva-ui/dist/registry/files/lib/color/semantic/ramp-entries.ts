import type { OKLCH, PaletteName, Ramp, StepLabel, SurfaceScale } from "@/lib/color/types";
import type { SemanticRole, SurfacePalette } from "@/lib/color/semantic/types";

export type RampEntry = { step: StepLabel; color: OKLCH };

export function rampEntries(scale: Ramp | SurfaceScale): RampEntry[] {
  return Object.keys(scale)
    .map((key) => Number(key))
    .sort((a, b) => a - b)
    .map((step) => ({ step, color: scale[step] as OKLCH }));
}

export function nearestByLightness(scale: Ramp | SurfaceScale, targetL: number): RampEntry {
  const entries = rampEntries(scale);
  let best = entries[0] as RampEntry;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const entry of entries) {
    const distance = Math.abs(entry.color.l - targetL);
    if (distance < bestDistance) {
      best = entry;
      bestDistance = distance;
    }
  }
  return best;
}

function aliasOf(palette: PaletteName | SurfacePalette, step: StepLabel): string {
  return `{color.primitive.${palette}.${step}}`;
}

export function entryToRole(
  palette: PaletteName | SurfacePalette,
  entry: RampEntry,
  description: string,
): SemanticRole {
  return {
    $value: aliasOf(palette, entry.step),
    $description: description,
    palette,
    step: entry.step,
    color: entry.color,
  };
}
