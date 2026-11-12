import {
  RAMP_STEPS,
  TAILWIND_ALIASES,
  evaluatePair,
  oklchToHex,
  type Hex,
  type OKLCH,
  type Ramp,
  type StepLabel,
} from "@/lib/color/index";
import {
  ACTION_FLOOR_STEP,
  ACTION_LABEL,
  ACTION_STEP,
  ACTION_USE,
  TAILWIND_STEPS,
  type ShadeScale,
  type TailwindStep,
} from "@/lib/theme-tokens/constants";

function rampIndexOf(step: StepLabel): number {
  return RAMP_STEPS.indexOf(step);
}

function nominalIndex(stop: TailwindStep): number {
  return rampIndexOf(TAILWIND_ALIASES[stop] as StepLabel);
}

function solveActionIndex(ramp: Ramp): number {
  const start = nominalIndex(ACTION_STEP);
  const floor = nominalIndex(ACTION_FLOOR_STEP);
  for (let index = start; index <= floor; index += 1) {
    const step = RAMP_STEPS[index] as StepLabel;
    if (evaluatePair(ACTION_LABEL, oklchToHex(ramp[step] as OKLCH), ACTION_USE).passes) return index;
  }
  return start;
}

/**
 * One alias table serves every palette so that `primary-100` and `accent-100`
 * stay siblings; it is solved on the brand ramp, the only one used as an action
 * fill.
 */
export function resolveAliases(brand: Ramp): Readonly<Record<TailwindStep, StepLabel>> {
  const action = solveActionIndex(brand);
  const table = {} as Record<TailwindStep, StepLabel>;
  let rank = 0;
  for (const stop of TAILWIND_STEPS) {
    const nominal = nominalIndex(stop);
    const index =
      stop < ACTION_STEP
        ? nominal
        : Math.min(RAMP_STEPS.length - 1, Math.max(nominal, action + rank));
    table[stop] = RAMP_STEPS[index] as StepLabel;
    if (stop >= ACTION_STEP) rank += 1;
  }
  return table;
}

export function shadeScale(ramp: Ramp, aliases: Readonly<Record<TailwindStep, StepLabel>>): ShadeScale {
  const scale = {} as Record<TailwindStep, Hex>;
  for (const stop of TAILWIND_STEPS) {
    scale[stop] = oklchToHex(ramp[aliases[stop]] as OKLCH);
  }
  return scale;
}
