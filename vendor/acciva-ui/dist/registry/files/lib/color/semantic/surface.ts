import { oklchToHex } from "@/lib/color/space/index";
import type { OKLCH, SemanticRampSet, StepLabel, SurfaceScale } from "@/lib/color/types";
import { rampEntries } from "@/lib/color/semantic/ramp-entries";

/**
 * The light (980/960/950/930) and dark (280/240/200/170/140) elevation ladders,
 * keyed by lightness x 1000. These are deliberately NOT members of RAMP_STEPS:
 * a tonal ramp only lands near them, and ALGORITHMS.md §7 fixes the dark ladder
 * at exactly 0.14/0.17/0.20/0.24/0.28, so they live on their own scale.
 */
export const SURFACE_STEPS: StepLabel[] = [980, 960, 950, 930, 280, 240, 200, 170, 140];

const SURFACE_CHROMA = 0.01;

/**
 * The elevation scale sits outside the tonal ramps: its lightnesses are fixed
 * by the ladders, not by a chroma curve, and it carries only the seed hue's
 * faintest tint (ALGORITHMS.md §7's `oklch(0.14 0.01 H_seed)`).
 */
export function buildSurfaceScale(hue: number): SurfaceScale {
  const scale: Record<StepLabel, OKLCH> = {};
  for (const step of SURFACE_STEPS) {
    scale[step] = { l: step / 1000, c: SURFACE_CHROMA, h: hue };
  }
  return scale;
}

/** Reads the seed hue off the brand ramp's most saturated step, where hue is never powerless. */
export function seedHue(ramps: SemanticRampSet): number {
  let hue = 0;
  let chroma = -1;
  for (const entry of rampEntries(ramps.brand)) {
    if (entry.color.c > chroma) {
      chroma = entry.color.c;
      hue = entry.color.h;
    }
  }
  return hue;
}
