import type { StepLabel } from "@/lib/color/types";

/** Tailwind v4's published OKLCH lightness per stop; the source of the aliases. */
const TAILWIND_REFERENCE_L: Record<number, number> = {
  50: 0.98,
  100: 0.93,
  200: 0.88,
  300: 0.82,
  400: 0.71,
  500: 0.62,
  600: 0.55,
  700: 0.49,
  800: 0.42,
  900: 0.38,
  950: 0.26,
};

/**
 * Tailwind's 11 stops mapped to the nearest of the 26 steps by the reference
 * lightness above. Hardcoded because it is a constant, not work to redo at
 * import time; a test recomputes it so it cannot drift from `RAMP_STEPS`.
 */
export const TAILWIND_ALIASES: Record<number, StepLabel> = {
  50: 980,
  100: 940,
  200: 880,
  300: 820,
  400: 700,
  500: 620,
  600: 540,
  700: 500,
  800: 420,
  900: 380,
  950: 260,
};
