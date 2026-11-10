import { RAMP_STEPS, TAILWIND_ALIASES, evaluatePair, oklchToHex, } from "../color/index.js";
import { ACTION_FLOOR_STEP, ACTION_LABEL, ACTION_STEP, ACTION_USE, TAILWIND_STEPS, } from "./constants.js";
function rampIndexOf(step) {
    return RAMP_STEPS.indexOf(step);
}
function nominalIndex(stop) {
    return rampIndexOf(TAILWIND_ALIASES[stop]);
}
function solveActionIndex(ramp) {
    const start = nominalIndex(ACTION_STEP);
    const floor = nominalIndex(ACTION_FLOOR_STEP);
    for (let index = start; index <= floor; index += 1) {
        const step = RAMP_STEPS[index];
        if (evaluatePair(ACTION_LABEL, oklchToHex(ramp[step]), ACTION_USE).passes)
            return index;
    }
    return start;
}
/**
 * One alias table serves every palette so that `primary-100` and `accent-100`
 * stay siblings; it is solved on the brand ramp, the only one used as an action
 * fill.
 */
export function resolveAliases(brand) {
    const action = solveActionIndex(brand);
    const table = {};
    let rank = 0;
    for (const stop of TAILWIND_STEPS) {
        const nominal = nominalIndex(stop);
        const index = stop < ACTION_STEP
            ? nominal
            : Math.min(RAMP_STEPS.length - 1, Math.max(nominal, action + rank));
        table[stop] = RAMP_STEPS[index];
        if (stop >= ACTION_STEP)
            rank += 1;
    }
    return table;
}
export function shadeScale(ramp, aliases) {
    const scale = {};
    for (const stop of TAILWIND_STEPS) {
        scale[stop] = oklchToHex(ramp[aliases[stop]]);
    }
    return scale;
}
