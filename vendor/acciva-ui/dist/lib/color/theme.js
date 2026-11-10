import { auditTokenGraph, } from "./audit.js";
import { exportDtcgJson } from "./export/dtcg.js";
import { exportTailwindTheme } from "./export/tailwind.js";
import { applyRoleOverrides, arrivalRoles, baselineRoleHexes, resolveRoles, roleOverridesFrom, splitIntent, tokenOverridesFrom, } from "./studio.js";
import { buildAppPalette, buildThemeStylesheet, DEFAULT_HARMONY } from "../theme-tokens.js";
/**
 * A headless WCAG 2.2 AA theme from a brand seed, with no human in the loop.
 *
 * Every non-converged role is split per mode automatically, through the same
 * dependency-ordered path `useColorStudio` uses. A seed that cannot resolve
 * does not throw and does not nudge the hue: the roles that cannot be carried
 * are returned in `unresolvable`, `passesAA` is `false`, and the emitters still
 * run so the caller can inspect the near miss.
 *
 * Pure and synchronous: no React, no I/O, no `process`, no filesystem.
 * Deterministic: the same seed and harmony give byte-identical output.
 */
export function generateTheme(seed, options) {
    var _a;
    const harmony = (_a = options === null || options === void 0 ? void 0 : options.harmony) !== null && _a !== void 0 ? _a : DEFAULT_HARMONY;
    const palette = buildAppPalette(seed, harmony);
    const arrival = arrivalRoles(palette);
    const splits = {};
    for (const intent of Object.values(arrival)) {
        if (intent === undefined || intent.resolution.kind === "converged")
            continue;
        const split = splitIntent(intent);
        if (split.resolution.kind === "split")
            splits[split.role] = split;
    }
    const decisions = splits;
    const roles = resolveRoles(palette, decisions);
    const baseAudit = auditTokenGraph(palette.document, seed);
    const baseline = baselineRoleHexes(baseAudit);
    const decided = {};
    for (const key of Object.keys(splits)) {
        const intent = roles[key];
        if (intent !== undefined)
            decided[key] = intent;
    }
    const roleOverrides = roleOverridesFrom(decided, baseline);
    const audit = applyRoleOverrides(baseAudit, roleOverrides);
    const overrides = tokenOverridesFrom(roleOverrides);
    const unresolvable = [];
    for (const intent of Object.values(roles)) {
        if (intent === undefined || intent.resolution.kind !== "unresolved")
            continue;
        unresolvable.push({
            role: intent.role,
            reason: intent.resolution.reason,
            required: intent.resolution.solution.required,
        });
    }
    return {
        seed,
        harmony,
        css: buildThemeStylesheet(palette, { seed, harmony }),
        tailwind: exportTailwindTheme(palette.document, overrides),
        dtcg: exportDtcgJson(palette.document, overrides),
        audit,
        passesAA: audit.failures.length === 0,
        overrides,
        unresolvable,
    };
}
