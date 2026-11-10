import { gatingDependenciesOf, roleDependencyOrder } from "./gating.js";
import { solveRoleIntent, splitIntent } from "./intent.js";
import { defaultIntentFor, roleHex } from "./palette.js";
export function resolveRoles(palette, decisions) {
    const roles = {};
    const order = roleDependencyOrder();
    const getContextHex = (contextRole, mode) => {
        const parentDecision = decisions[contextRole];
        if (parentDecision && parentDecision.resolution.kind !== "unresolved") {
            const hex = parentDecision.resolution.solution[mode].hex;
            if (hex !== null)
                return hex;
        }
        const parent = roles[contextRole];
        if (parent && parent.resolution.kind !== "unresolved") {
            const hex = parent.resolution.solution[mode].hex;
            if (hex !== null)
                return hex;
        }
        return roleHex(palette, mode, contextRole);
    };
    for (const studioRole of order) {
        const decision = decisions[studioRole.role];
        const deps = gatingDependenciesOf(studioRole);
        const hasOverriddenDep = deps.some((dep) => {
            const d = decisions[dep];
            return d && d.resolution.kind !== "unresolved";
        });
        if (decision) {
            if (decision.resolution.kind === "split" && hasOverriddenDep) {
                const solved = solveRoleIntent(palette, studioRole, decision.intent, getContextHex);
                roles[studioRole.role] = splitIntent(solved);
            }
            else {
                roles[studioRole.role] = decision;
            }
        }
        else {
            roles[studioRole.role] = solveRoleIntent(palette, studioRole, defaultIntentFor(palette, studioRole.role), getContextHex);
        }
    }
    return roles;
}
/**
 * The engine's answer to the seed, for every gating role, before the designer
 * has touched anything.
 *
 * It is derived from the palette rather than dispatched from step 2's render,
 * because a role's solve is not a designer decision: it is what `solveDualMode`
 * says about this seed, and it holds whether or not anyone has looked at the
 * row. Deriving it also means a converged role counts as resolved from the
 * solve rather than from having been displayed — step gating that waits on a
 * render pass is gating on the wrong thing.
 */
export function arrivalRoles(palette) {
    return resolveRoles(palette, {});
}
