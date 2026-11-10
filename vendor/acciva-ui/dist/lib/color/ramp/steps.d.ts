import type { StepLabel } from "../types.js";
/**
 * Exactly 26 steps. The label *is* the target lightness times 1000, so
 * `ramp[step].l === step / 1000` holds exactly and callers can address a surface
 * by its lightness. Spacing tightens toward the light end, where tints need the
 * most resolution.
 */
export declare const RAMP_STEPS: StepLabel[];
export declare const RAMP_L_MAX = 0.98;
export declare const RAMP_L_MIN = 0.05;
