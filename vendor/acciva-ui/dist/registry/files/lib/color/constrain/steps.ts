import { RAMP_STEPS } from "@/lib/color/ramp/index";
import type { Ramp, StepLabel } from "@/lib/color/types";
import type { Candidate } from "@/lib/color/constrain/types";

/**
 * The ramp's own steps, ascending in lightness. Read off the ramp rather than
 * from `RAMP_STEPS` so an elevation `SurfaceScale` — whose keys are the
 * elevation ladders, not ramp steps — solves the same way.
 */
export function stepsOf(ramp: Ramp): StepLabel[] {
  return Object.keys(ramp)
    .map((key) => Number(key))
    .filter((step) => Number.isFinite(step))
    .sort((a, b) => a - b);
}

/**
 * The canonical ramp step closest to a raw OKLCH lightness. Callers holding a
 * designer's lightness rather than a step label use this to name their intent.
 */
export function nearestRampStep(lightness: number): StepLabel {
  const target = lightness * 1000;
  let best = RAMP_STEPS[0] as StepLabel;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const step of RAMP_STEPS) {
    const distance = Math.abs(step - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = step;
    }
  }
  return best;
}

export function intentIndex(steps: readonly StepLabel[], intent: StepLabel): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < steps.length; i += 1) {
    const distance = Math.abs((steps[i] as StepLabel) - intent);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

/**
 * Nearest to the intent wins. Ties — the intent sitting exactly between two
 * qualifying steps — go to the larger minimum ratio, so the tie-break spends
 * the free choice on headroom rather than on ramp direction.
 */
export function pickNearest(
  candidates: readonly Candidate[],
  anchor: number,
  headroom: (candidate: Candidate) => number,
): Candidate | null {
  let best: Candidate | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestHeadroom = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    const distance = Math.abs(candidate.index - anchor);
    const candidateHeadroom = headroom(candidate);
    if (
      distance < bestDistance ||
      (distance === bestDistance && candidateHeadroom > bestHeadroom)
    ) {
      best = candidate;
      bestDistance = distance;
      bestHeadroom = candidateHeadroom;
    }
  }
  return best;
}
