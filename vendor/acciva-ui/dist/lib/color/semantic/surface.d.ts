import type { SemanticRampSet, StepLabel, SurfaceScale } from "../types.js";
/**
 * The light (980/960/950/930) and dark (280/240/200/170/140) elevation ladders,
 * keyed by lightness x 1000. These are deliberately NOT members of RAMP_STEPS:
 * a tonal ramp only lands near them, and ALGORITHMS.md §7 fixes the dark ladder
 * at exactly 0.14/0.17/0.20/0.24/0.28, so they live on their own scale.
 */
export declare const SURFACE_STEPS: StepLabel[];
/**
 * The elevation scale sits outside the tonal ramps: its lightnesses are fixed
 * by the ladders, not by a chroma curve, and it carries only the seed hue's
 * faintest tint (ALGORITHMS.md §7's `oklch(0.14 0.01 H_seed)`).
 */
export declare function buildSurfaceScale(hue: number): SurfaceScale;
/** Reads the seed hue off the brand ramp's most saturated step, where hue is never powerless. */
export declare function seedHue(ramps: SemanticRampSet): number;
