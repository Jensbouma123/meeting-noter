import { oklchToHex } from "../space/index.js";
import { contrastRatio } from "../contrast/index.js";
import { solveDualMode } from "../constrain/index.js";
import { nearestByLightness, rampEntries } from "./ramp-entries.js";
/**
 * The steps of `scale` that clear every constraint.
 *
 * `solveDualMode` grades a pair of contexts at a time and reports
 * `stepsClearingBoth` — exactly the steps that clear both — so the contexts are
 * walked two at a time and the sets intersected; an odd trailing context is
 * graded against itself. A role rendered on three elevations is therefore held
 * to the worst of the three rather than to whichever one a designer named.
 */
function clearingSteps(scale, intent, constraints) {
    let clearing = null;
    for (const constraint of constraints) {
        for (let index = 0; index < constraint.contexts.length; index += 2) {
            const first = constraint.contexts[index];
            const second = (constraint.contexts[index + 1] ?? first);
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
function minRatio(color, contexts) {
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
export function solvedEntry(scale, targetL, required, preferred = []) {
    const entries = rampEntries(scale);
    const intent = nearestByLightness(scale, targetL);
    const anchor = entries.findIndex((entry) => entry.step === intent.step);
    const withPreferred = preferred.length === 0
        ? []
        : clearingSteps(scale, intent.step, [...required, ...preferred]);
    const steps = withPreferred.length > 0
        ? withPreferred
        : clearingSteps(scale, intent.step, required);
    if (steps.length === 0)
        return intent;
    const contexts = [...required, ...preferred].flatMap((constraint) => constraint.contexts);
    let best = intent;
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestHeadroom = Number.NEGATIVE_INFINITY;
    for (const step of steps) {
        const index = entries.findIndex((entry) => entry.step === step);
        const entry = entries[index];
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
