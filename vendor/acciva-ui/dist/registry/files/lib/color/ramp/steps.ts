import type { StepLabel } from "@/lib/color/types";

/**
 * Exactly 26 steps. The label *is* the target lightness times 1000, so
 * `ramp[step].l === step / 1000` holds exactly and callers can address a surface
 * by its lightness. Spacing tightens toward the light end, where tints need the
 * most resolution.
 */
export const RAMP_STEPS: StepLabel[] = [
  980, 960, 940, 910, 880, 850, 820, 780, 740, 700, 660, 620, 580, 540, 500, 460, 420,
  380, 340, 300, 260, 220, 180, 140, 100, 50,
];

export const RAMP_L_MAX = 0.98;
export const RAMP_L_MIN = 0.05;
