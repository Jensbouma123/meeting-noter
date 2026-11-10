import { REQUIRED_PAIRS } from "../audit/index.js";
import { solveDualMode, solveMultiContextDualMode, } from "../constrain/index.js";
import { rampForRole, roleHex } from "./palette.js";
/**
 * Solve one role across all of its contexts for both modes at once.
 */
export function solveRoleIntent(palette, role, intent, contextHex) {
    const ramp = rampForRole(palette, role.role);
    const contexts = [];
    for (const id of role.pairIds) {
        const pair = REQUIRED_PAIRS.find((entry) => entry.id === id);
        if (pair === undefined || pair.exempt || pair.use === "decorative")
            continue;
        const contextRole = pair.adjustable === "foreground" ? pair.background : pair.foreground;
        contexts.push({
            lightBackground: contextHex ? contextHex(contextRole, "light") : roleHex(palette, "light", contextRole),
            darkBackground: contextHex ? contextHex(contextRole, "dark") : roleHex(palette, "dark", contextRole),
            use: pair.use,
        });
    }
    const multiSolution = solveMultiContextDualMode({
        ramp,
        intent,
        contexts,
        use: role.use,
    });
    let binding = null;
    for (const context of contexts) {
        const solution = solveDualMode({
            ramp,
            intent,
            lightBackground: context.lightBackground,
            darkBackground: context.darkBackground,
            use: context.use ?? role.use,
        });
        if (solution.stepsClearingBoth.length > 0) {
            if (binding === null || solution.stepsClearingBoth.length < binding.stepsClearingBoth.length) {
                binding = solution;
            }
        }
    }
    const solution = binding !== null
        ? {
            ...binding,
            lightStep: multiSolution.lightStep ?? binding.lightStep,
            darkStep: multiSolution.darkStep ?? binding.darkStep,
        }
        : multiSolution;
    const resolution = solution.converged
        ? { kind: "converged", solution }
        : { kind: "unresolved", solution, reason: solution.reason ?? "no-shared-step" };
    return { role: role.role, intent, use: role.use, resolution };
}
/**
 * Record the per-mode divergence the designer chose. Legal only when both modes
 * solve alone, which is exactly `reason === "no-shared-step"` — the caller
 * checks, and a `null` step never becomes a colour.
 */
export function splitIntent(intent) {
    const { solution } = intent.resolution;
    const light = solution.light.step;
    const dark = solution.dark.step;
    if (light === null || dark === null)
        return intent;
    return {
        ...intent,
        resolution: { kind: "split", solution, light, dark },
    };
}
export function unresolveIntent(intent) {
    const { solution } = intent.resolution;
    return {
        ...intent,
        resolution: {
            kind: "unresolved",
            solution,
            reason: solution.reason ?? "no-shared-step",
        },
    };
}
