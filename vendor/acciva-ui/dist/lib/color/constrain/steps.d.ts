import type { Ramp, StepLabel } from "../types.js";
import type { Candidate } from "./types.js";
/**
 * The ramp's own steps, ascending in lightness. Read off the ramp rather than
 * from `RAMP_STEPS` so an elevation `SurfaceScale` — whose keys are the
 * elevation ladders, not ramp steps — solves the same way.
 */
export declare function stepsOf(ramp: Ramp): StepLabel[];
/**
 * The canonical ramp step closest to a raw OKLCH lightness. Callers holding a
 * designer's lightness rather than a step label use this to name their intent.
 */
export declare function nearestRampStep(lightness: number): StepLabel;
export declare function intentIndex(steps: readonly StepLabel[], intent: StepLabel): number;
/**
 * Nearest to the intent wins. Ties — the intent sitting exactly between two
 * qualifying steps — go to the larger minimum ratio, so the tie-break spends
 * the free choice on headroom rather than on ramp direction.
 */
export declare function pickNearest(candidates: readonly Candidate[], anchor: number, headroom: (candidate: Candidate) => number): Candidate | null;
