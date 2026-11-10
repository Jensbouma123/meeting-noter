import type { Gamut, OKLCH, Ramp } from "../types.js";
/**
 * The seed's 26-step tonal ramp. Lightness is fixed by the step label; chroma
 * follows the hue's curve, scaled so the ramp passes through the seed — a muted
 * seed yields a muted ramp instead of every seed of a hue collapsing onto one
 * palette. Every step is gamut-mapped, so all 26 are guaranteed renderable.
 */
export declare function buildRamp(seed: OKLCH, gamut?: Gamut): Ramp;
