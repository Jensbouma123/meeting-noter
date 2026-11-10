import type { Gamut, OKLCH, Ramp, StepLabel } from "./types.js";
/**
 * Exactly 26 steps. The label *is* the target lightness times 1000, so
 * `ramp[step].l === step / 1000` holds exactly and callers can address a surface
 * by its lightness. Spacing tightens toward the light end, where tints need the
 * most resolution.
 */
export declare const RAMP_STEPS: StepLabel[];
export declare const RAMP_L_MAX = 0.98;
export declare const RAMP_L_MIN = 0.05;
/**
 * Tailwind's 11 stops mapped to the nearest of the 26 steps by the reference
 * lightness above. Hardcoded because it is a constant, not work to redo at
 * import time; a test recomputes it so it cannot drift from `RAMP_STEPS`.
 */
export declare const TAILWIND_ALIASES: Record<number, StepLabel>;
/**
 * Parabolic falloff around the hue's saturation lightness, clamped at zero.
 * Constant chroma down a ramp asks for colours that do not exist at the
 * extremes, and gamut mapping then flattens them all to the same value.
 */
export declare function chromaCurve(l: number, cMax: number, lPeak: number, sigma: number): number;
export declare function peakLightnessForHue(h: number): number;
export declare function maxChromaForHue(h: number): number;
/**
 * The seed's 26-step tonal ramp. Lightness is fixed by the step label; chroma
 * follows the hue's curve, scaled so the ramp passes through the seed — a muted
 * seed yields a muted ramp instead of every seed of a hue collapsing onto one
 * palette. Every step is gamut-mapped, so all 26 are guaranteed renderable.
 */
export declare function buildRamp(seed: OKLCH, gamut?: Gamut): Ramp;
