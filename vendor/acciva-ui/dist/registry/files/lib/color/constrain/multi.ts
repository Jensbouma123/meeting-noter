import { contrastRatio, WCAG_THRESHOLDS } from "@/lib/color/contrast/index";
import { oklchToHex } from "@/lib/color/space/index";
import type { Hex, OKLCH } from "@/lib/color/types";
import { emptyMeasurement, measurement, unsolvedReason } from "@/lib/color/constrain/measure";
import { intentIndex, pickNearest, stepsOf } from "@/lib/color/constrain/steps";
import type { Candidate, DualModeContext, DualModeSolution, MultiContextDualModeRequest } from "@/lib/color/constrain/types";

/**
 * Solve one role across all of its contexts for both modes at once.
 *
 * Walks the role's ramp for the step nearest `intent` whose colour clears WCAG 2.2
 * AA against every context in light mode and every context in dark mode.
 */
export function solveMultiContextDualMode(
  request: MultiContextDualModeRequest,
): DualModeSolution {
  const { ramp, intent, contexts, use } = request;
  const required = WCAG_THRESHOLDS[use];
  const steps = stepsOf(ramp);

  const fallbackContext: DualModeContext = contexts[0] ?? {
    lightBackground: "#ffffff" as Hex,
    darkBackground: "#000000" as Hex,
    use,
  };

  if (steps.length === 0 || contexts.length === 0) {
    return {
      converged: false,
      step: null,
      color: null,
      hex: null,
      use,
      required,
      intent,
      intentDistance: null,
      light: emptyMeasurement("light", fallbackContext.lightBackground),
      dark: emptyMeasurement("dark", fallbackContext.darkBackground),
      lightStep: null,
      darkStep: null,
      reason: steps.length === 0 ? "empty-ramp" : "both-unsolvable",
      stepsClearingBoth: [],
    };
  }

  const anchor = intentIndex(steps, intent);

  const candidates: Candidate[] = steps.map((step, index) => {
    const color = ramp[step] as OKLCH;
    const hex = oklchToHex(color);

    let minLightRatio = Number.POSITIVE_INFINITY;
    let minDarkRatio = Number.POSITIVE_INFINITY;
    let bindingLightContext: DualModeContext = fallbackContext;
    let bindingDarkContext: DualModeContext = fallbackContext;
    let passesLight = true;
    let passesDark = true;

    for (const context of contexts) {
      const targetRatio = WCAG_THRESHOLDS[context.use ?? use];
      const lightRatio = contrastRatio(hex, context.lightBackground);
      const darkRatio = contrastRatio(hex, context.darkBackground);

      if (lightRatio < minLightRatio) {
        minLightRatio = lightRatio;
        bindingLightContext = context;
      }
      if (darkRatio < minDarkRatio) {
        minDarkRatio = darkRatio;
        bindingDarkContext = context;
      }
      if (lightRatio < targetRatio) passesLight = false;
      if (darkRatio < targetRatio) passesDark = false;
    }

    return {
      step,
      index,
      color,
      hex,
      minLightRatio,
      minDarkRatio,
      bindingLightContext,
      bindingDarkContext,
      passesLight,
      passesDark,
    };
  });

  const clearingBoth = candidates.filter(
    (candidate) => candidate.passesLight && candidate.passesDark,
  );
  const shared = pickNearest(clearingBoth, anchor, (candidate) =>
    Math.min(candidate.minLightRatio, candidate.minDarkRatio),
  );

  const lightOnly = pickNearest(
    candidates.filter((candidate) => candidate.passesLight),
    anchor,
    (candidate) => candidate.minLightRatio,
  );
  const darkOnly = pickNearest(
    candidates.filter((candidate) => candidate.passesDark),
    anchor,
    (candidate) => candidate.minDarkRatio,
  );
  const atIntent = candidates[anchor] as Candidate;

  const light = measurement("light", shared ?? lightOnly, atIntent);
  const dark = measurement("dark", shared ?? darkOnly, atIntent);

  if (shared === null) {
    return {
      converged: false,
      step: null,
      color: null,
      hex: null,
      use,
      required,
      intent,
      intentDistance: null,
      light,
      dark,
      lightStep: lightOnly?.step ?? null,
      darkStep: darkOnly?.step ?? null,
      reason: unsolvedReason(lightOnly !== null, darkOnly !== null),
      stepsClearingBoth: [],
    };
  }

  return {
    converged: true,
    step: shared.step,
    color: shared.color,
    hex: shared.hex,
    use,
    required,
    intent,
    intentDistance: Math.abs(shared.index - anchor),
    light,
    dark,
    lightStep: shared.step,
    darkStep: shared.step,
    reason: null,
    stepsClearingBoth: clearingBoth.map((candidate) => candidate.step),
  };
}
