import { REQUIRED_PAIRS } from "../audit/index.js";
import { WCAG_THRESHOLDS } from "../contrast/index.js";
function strictest(a, b) {
    return WCAG_THRESHOLDS[b] > WCAG_THRESHOLDS[a] ? b : a;
}
function gatingRoles() {
    const byRole = new Map();
    for (const pair of REQUIRED_PAIRS) {
        if (pair.exempt || pair.use === "decorative")
            continue;
        const role = pair.adjustable === "foreground" ? pair.foreground : pair.background;
        const existing = byRole.get(role);
        if (existing === undefined) {
            byRole.set(role, { use: pair.use, pairIds: [pair.id] });
            continue;
        }
        existing.use = strictest(existing.use, pair.use);
        existing.pairIds.push(pair.id);
    }
    return [...byRole].map(([role, entry]) => ({
        role,
        use: entry.use,
        pairIds: entry.pairIds,
    }));
}
/**
 * Every role that gates export, in `REQUIRED_PAIRS` order. Exempt rows
 * (`foreground.disabled`, `border.subtle`) contribute no role: they are
 * measured and reported, never gated, so there is nothing for a designer to
 * resolve.
 */
export const STUDIO_ROLES = gatingRoles();
export function studioRole(role) {
    return STUDIO_ROLES.find((entry) => entry.role === role);
}
/**
 * The fixed colours a role is measured against, one per gating pair. A pair
 * names two roles and which one a solver may move; the other side is this
 * role's context, and it is read per mode because light and dark resolve their
 * roles independently.
 */
export function contextsFor(role) {
    const paths = [];
    for (const id of role.pairIds) {
        const pair = REQUIRED_PAIRS.find((entry) => entry.id === id);
        if (pair === undefined)
            continue;
        const context = pair.adjustable === "foreground" ? pair.background : pair.foreground;
        if (!paths.includes(context))
            paths.push(context);
    }
    return paths;
}
export function gatingDependenciesOf(role) {
    const deps = [];
    for (const id of role.pairIds) {
        const pair = REQUIRED_PAIRS.find((entry) => entry.id === id);
        if (!pair || pair.exempt || pair.use === "decorative")
            continue;
        const contextRole = pair.adjustable === "foreground" ? pair.background : pair.foreground;
        if (contextRole !== role.role && STUDIO_ROLES.some((r) => r.role === contextRole)) {
            if (!deps.includes(contextRole))
                deps.push(contextRole);
        }
    }
    return deps;
}
export function roleDependencyOrder() {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();
    const roleMap = new Map(STUDIO_ROLES.map((r) => [r.role, r]));
    function visit(r) {
        if (visited.has(r.role))
            return;
        if (visiting.has(r.role))
            return;
        visiting.add(r.role);
        for (const depPath of gatingDependenciesOf(r)) {
            const dep = roleMap.get(depPath);
            if (dep)
                visit(dep);
        }
        visiting.delete(r.role);
        visited.add(r.role);
        sorted.push(r);
    }
    for (const r of STUDIO_ROLES) {
        visit(r);
    }
    return sorted;
}
