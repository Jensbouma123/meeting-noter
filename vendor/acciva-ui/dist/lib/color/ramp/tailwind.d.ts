import type { StepLabel } from "../types.js";
/**
 * Tailwind's 11 stops mapped to the nearest of the 26 steps by the reference
 * lightness above. Hardcoded because it is a constant, not work to redo at
 * import time; a test recomputes it so it cannot drift from `RAMP_STEPS`.
 */
export declare const TAILWIND_ALIASES: Record<number, StepLabel>;
