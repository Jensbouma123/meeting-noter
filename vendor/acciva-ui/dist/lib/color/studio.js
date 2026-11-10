import { REQUIRED_PAIRS, gradePair, } from "./audit.js";
import { solveDualMode, solveMultiContextDualMode, } from "./constrain.js";
import { WCAG_THRESHOLDS } from "./contrast.js";
import { cssVariableName } from "./export/resolve.js";
import { oklchToHex } from "./space.js";
const MODES = ["light", "dark"];
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
/** `SemanticRole.palette` names an engine ramp; `AppPalette.ramps` keys it by app name. */
const RAMP_OF_PALETTE = {
    brand: "primary",
    accent: "accent",
    neutral: "neutral",
    success: "success",
    warning: "warning",
    danger: "danger",
    info: "info",
};
const ROLE_GROUPS = [
    "background",
    "foreground",
    "border",
    "accent",
    "status",
];
function roleAt(roles, path) {
    const [group, name] = path.split(".");
    return roles[group][name];
}
/**
 * The elevation surfaces are cut from a `SurfaceScale` whose keys are the
 * elevation ladders, not ramp steps, so `AppPalette.ramps` does not carry it.
 * It is recovered from the roles that alias it — both modes, because the light
 * ladder (980/960/950/930) and the dark one (140…280) are disjoint halves of
 * the same scale. `solveDualMode` reads steps off the scale it is handed, so an
 * elevation role solves exactly the way a ramp role does.
 */
export function surfaceScaleOf(palette) {
    const scale = {};
    for (const mode of MODES) {
        const roles = palette.roles[mode];
        for (const group of ROLE_GROUPS) {
            for (const role of Object.values(roles[group])) {
                if (role.palette === "surface")
                    scale[role.step] = role.color;
            }
        }
    }
    return scale;
}
/** The scale a role's value is drawn from — the vocabulary its solve may use. */
export function rampForRole(palette, path) {
    const name = roleAt(palette.roles.light, path).palette;
    if (name === "surface")
        return surfaceScaleOf(palette);
    return palette.ramps[RAMP_OF_PALETTE[name]];
}
export function roleHex(palette, mode, path) {
    return oklchToHex(roleAt(palette.roles[mode], path).color);
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
/** The role's own light-mode step: the designer's starting intent before any edit. */
export function defaultIntentFor(palette, path) {
    return roleAt(palette.roles.light, path).step;
}
/**
 * Solve one role across all of its contexts for both modes at once.
 */
export function solveRoleIntent(palette, role, intent, contextHex) {
    var _a, _b, _c, _d;
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
            use: (_a = context.use) !== null && _a !== void 0 ? _a : role.use,
        });
        if (solution.stepsClearingBoth.length > 0) {
            if (binding === null || solution.stepsClearingBoth.length < binding.stepsClearingBoth.length) {
                binding = solution;
            }
        }
    }
    const solution = binding !== null
        ? Object.assign(Object.assign({}, binding), { lightStep: (_b = multiSolution.lightStep) !== null && _b !== void 0 ? _b : binding.lightStep, darkStep: (_c = multiSolution.darkStep) !== null && _c !== void 0 ? _c : binding.darkStep }) : multiSolution;
    const resolution = solution.converged
        ? { kind: "converged", solution }
        : { kind: "unresolved", solution, reason: (_d = solution.reason) !== null && _d !== void 0 ? _d : "no-shared-step" };
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
    return Object.assign(Object.assign({}, intent), { resolution: { kind: "split", solution, light, dark } });
}
export function unresolveIntent(intent) {
    var _a;
    const { solution } = intent.resolution;
    return Object.assign(Object.assign({}, intent), { resolution: {
            kind: "unresolved",
            solution,
            reason: (_a = solution.reason) !== null && _a !== void 0 ? _a : "no-shared-step",
        } });
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
function gatingDependenciesOf(role) {
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
 */
export function arrivalRoles(palette) {
    return resolveRoles(palette, {});
}
/**
 * What the token graph already holds for every role a pair names, per mode.
 * Read back off the audit rather than off `palette.roles`, so the comparison is
 * against the colours that actually ship — alias indirection and export
 * rounding included — and costs nothing beyond the audit already computed.
 */
export function baselineRoleHexes(audit) {
    const index = { light: {}, dark: {} };
    const collect = (results, mode) => {
        for (const result of results) {
            index[mode][result.foregroundRole] = result.foreground;
            index[mode][result.backgroundRole] = result.background;
        }
    };
    collect(audit.light, "light");
    collect(audit.dark, "dark");
    return index;
}
/**
 * The per-mode values the designer's decisions move the theme to.
 *
 * Only `state.roles` — decisions the designer actually made — feeds this. The
 * arrival solve deliberately does not: it is anchored on the role's *light*
 * step, so its dark answer is the passing step nearest a light intent rather
 * than the one the theme already ships, and applying it unasked would move
 * every role and fail pairs that were passing. A proposal is not a change.
 *
 * A mode whose solved hex is the one the graph already holds contributes no
 * entry, so the export diff lists real movement only and the audit re-grades
 * nothing it does not have to.
 */
export function roleOverridesFrom(roles, baseline) {
    const overrides = { light: {}, dark: {} };
    for (const entry of Object.values(roles)) {
        if (entry === undefined || entry.resolution.kind === "unresolved")
            continue;
        for (const mode of MODES) {
            const hex = entry.resolution.solution[mode].hex;
            // A `null` step has no conformant colour and is never rendered as one.
            if (hex === null || baseline[mode][entry.role] === hex)
                continue;
            overrides[mode][entry.role] = hex;
        }
    }
    return overrides;
}
function hasOverrides(overrides) {
    return MODES.some((mode) => Object.keys(overrides[mode]).length > 0);
}
const PAIR_BY_ID = new Map(REQUIRED_PAIRS.map((pair) => [pair.id, pair]));
/**
 * The audit the gate reads: the seed's verdict with the designer's overrides
 * applied.
 *
 * This is the whole point. `auditTokenGraph` grades the graph the seed built,
 * which knows nothing about a role the designer moved — so a resolved role's
 * fix used to be invisible to `passesAA` in both directions: a fix could not
 * open the gate, and a regression could not close it. The gate has to grade the
 * colours that will be emitted, and the emitted colours are graph plus
 * overrides.
 *
 * It re-grades **only the rows an override touches**, and returns `base`
 * unchanged when there are none, so the 124-verdict pass stays keyed on the
 * seed. Every untouched `PairResult` is passed through by reference.
 */
export function applyRoleOverrides(base, overrides) {
    if (!hasOverrides(overrides))
        return base;
    const regrade = (results, mode) => {
        const forMode = overrides[mode];
        if (Object.keys(forMode).length === 0)
            return results;
        return results.map((result) => {
            const foreground = forMode[result.foregroundRole];
            const background = forMode[result.backgroundRole];
            if (foreground === undefined && background === undefined)
                return result;
            const pair = PAIR_BY_ID.get(result.id);
            if (pair === undefined)
                return result;
            return gradePair(pair, mode, foreground !== null && foreground !== void 0 ? foreground : result.foreground, background !== null && background !== void 0 ? background : result.background);
        });
    };
    const light = regrade(base.light, "light");
    const dark = regrade(base.dark, "dark");
    const failures = [...light, ...dark].filter((result) => !result.pass && !result.exempt);
    return Object.assign(Object.assign({}, base), { light, dark, failures, passesAA: failures.length === 0 });
}
/**
 * The same movement as a `ModeTokenOverrides`, which is what the three emitters
 * take. `cssVariableName` drops the mode segment, so both modes address the
 * same property and a per-mode divergence lands as one entry per mode — which
 * is what per-mode overrides exist for.
 */
export function tokenOverridesFrom(overrides) {
    const emit = (mode) => {
        const out = {};
        for (const [role, hex] of Object.entries(overrides[mode])) {
            if (hex === undefined)
                continue;
            out[cssVariableName(["color", "semantic", "light", ...role.split(".")])] = hex;
        }
        return out;
    };
    return { light: emit("light"), dark: emit("dark") };
}
