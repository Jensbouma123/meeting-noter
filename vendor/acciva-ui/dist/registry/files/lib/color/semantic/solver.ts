import { oklchToHex } from "@/lib/color/space/index";
import { contrastRatio } from "@/lib/color/contrast/index";
import { solveDualMode, type DualModeUse } from "@/lib/color/constrain/index";
import type { Hex, OKLCH, Ramp, StepLabel, SurfaceScale } from "@/lib/color/types";
import { nearestByLightness, rampEntries, type RampEntry } from "@/lib/color/semantic/ramp-entries";

/**
 * One WCAG 2.2 AA floor and every colour the role is rendered against at that
 * floor. A role can carry several: the secondary accent is body text on its own
 * tinted background (4.5:1) and a large heading on the page canvas (3:1), and
 * holding the looser context to the stricter floor would move a role that
 * already conforms.
 */
export type RoleConstraint = { readonly use: DualModeUse; readonly contexts: readonly Hex[] };

/**
 * The steps of `scale` that clear every constraint.
 *
 * `solveDualMode` grades a pair of contexts at a time and reports
 * `stepsClearingBoth` — exactly the steps that clear both — so the contexts are
 * walked two at a time and the sets intersected; an odd trailing context is
 * graded against itself. A role rendered on three elevations is therefore held
 * to the worst of the three rather than to whichever one a designer named.
 */
function clearingSteps(
  scale: Ramp | SurfaceScale,
  intent: StepLabel,
  constraints: readonly RoleConstraint[],
): StepLabel[] {
  let clearing: StepLabel[] | null = null;
  for (const constraint of constraints) {
    for (let index = 0; index < constraint.contexts.length; index += 2) {
      const first = constraint.contexts[index] as Hex;
      const second = (constraint.contexts[index + 1] ?? first) as Hex;
      const passing = solveDualMode({
        ramp: scale,
        intent,
        lightBackground: first,
        darkBackground: second,
        use: constraint.use,
      }).stepsClearingBoth;
      clearing =
        clearing === null
          ? [...passing]
          : clearing.filter((step) => passing.includes(step));
    }
  }
  return clearing ?? [];
}

function minRatio(color: OKLCH, contexts: readonly Hex[]): number {
  const hex = oklchToHex(color);
  let lowest = Number.POSITIVE_INFINITY;
  for (const context of contexts) {
    lowest = Math.min(lowest, contrastRatio(hex, context));
  }
  return lowest;
}

/**
 * The step nearest the designer's intent that clears `required` and, when any
 * step clears both tiers, `preferred` as well. Ties — the intent sitting
 * equidistant between two qualifying steps — go to the larger minimum ratio, so
 * the free choice buys headroom rather than ramp direction.
 *
 * When nothing clears `required` the intent step is returned unchanged. The
 * role stays populated and `auditTheme` reports the shortfall; silently
 * widening the floor or dropping the role would hide a real failure.
 */
export function solvedEntry(
  scale: Ramp | SurfaceScale,
  targetL: number,
  required: readonly RoleConstraint[],
  preferred: readonly RoleConstraint[] = [],
): RampEntry {
  const entries = rampEntries(scale);
  const intent = nearestByLightness(scale, targetL);
  const anchor = entries.findIndex((entry) => entry.step === intent.step);

  const withPreferred =
    preferred.length === 0
      ? []
      : clearingSteps(scale, intent.step, [...required, ...preferred]);
  const steps =
    withPreferred.length > 0
      ? withPreferred
      : clearingSteps(scale, intent.step, required);
  if (steps.length === 0) return intent;

  const contexts = [...required, ...preferred].flatMap(
    (constraint) => constraint.contexts,
  );
  let best = intent;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestHeadroom = Number.NEGATIVE_INFINITY;
  for (const step of steps) {
    const index = entries.findIndex((entry) => entry.step === step);
    const entry = entries[index] as RampEntry;
    const distance = Math.abs(index - anchor);
    const headroom = minRatio(entry.color, contexts);
    if (distance < bestDistance || (distance === bestDistance && headroom > bestHeadroom)) {
      best = entry;
      bestDistance = distance;
      bestHeadroom = headroom;
    }
  }
  return best;
}
